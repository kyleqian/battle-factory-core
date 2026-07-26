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

## 7. Kernel event inventory refresh, 2026-07-25

Read-only recon only, one week after §1-6 above (no production code touched
this pass either). Since `docs/presentation-seam-scout.md` was written
(2026-07-24, commit `c95343f`), PROGRESS entries #439/#440 registered
`B_SCR_OP_JUMPIFBYTE`/`B_SCR_OP_GETEXP`/`B_SCR_OP_CHECKTEAMSLOST` (party-HP
outcome plumbing), `B_SCR_OP_DOFAINTANIMATION`/`B_SCR_OP_CLEAREFFECTSONFAINT`
(opcodes 26/27) and `B_SCR_OP_MOVEEND` (opcode 73), then built the
`HandleFaintedMonActions` orchestration
(`battleScriptFaintedActionsOrchestration.ts`) and a first real terminal
decision boundary (`factoryBattleScriptTerminalDecision.ts`). This section
re-derives §1's event table against today's `HEAD` (`733ffca`) and re-checks
§4-6's checkpoint pack against that growth.

### 7.1 Current event-kind table (20 kinds; §1's baseline was 19)

The union at `battleScriptEvents.ts:40-149` now has **20** `kind` variants —
one new since §1: `faint-animation` (`battleScriptEvents.ts:67-71`). Re-grepped
every `kind: "<exact-variant>"` object-literal site across
`src/engine/battleScript*.ts` and `src/engine/factoryBattleScript*.ts`
(excluding the type file), read each hit, and cross-checked ambiguous ones
against their named test (not inferred from code alone — see the `message`
row below, where the code-only guess in §4 turned out wrong).

| kind | payload fields | emitting opcode/mechanism — file:line | Tier-1 test | today |
| --- | --- | --- | --- | --- |
| `message` | `messageId`, `substitutions` | unchanged: `B_SCR_OP_PRINTSTRING` `battleScriptSourceCommands.ts:868-883`; `attackstring`/`critmessage`/`resultmessage`/`healthbarupdate`-substitute, `battleScriptHitChainOpcode.ts:1928-1940` (install sites). **Newly *reached* (not newly registered):** the fainted-branch `printstring` inside `BattleScript_FaintTarget` (`reference/pokeemerald/data/battle_scripts_1.s:2817-2823`) now executes end-to-end once opcodes 26/27/73 are registered | `battleScriptSourceCommands.test.ts:466`; full-chain reach: `battleScriptHitChainOpcode.test.ts:1386-1483` | emitted; the fainted-branch site is newly *reachable* this week |
| `selection-message` | full snapshot | unchanged, `battleScriptSourceCommands.ts:884-913` | `battleScriptPrintSelectionString.test.ts:187` | emitted |
| `play-se` | `songId` | unchanged, `battleScriptSourceCommands.ts:919`; `effectivenesssound` `battleScriptHitChainOpcode.ts:1158` | `battleScriptAudioCommands.test.ts:199` | emitted |
| `play-fanfare` | `songId` | unchanged, `battleScriptSourceCommands.ts:921` | `battleScriptAudioCommands.test.ts:255` | emitted |
| `play-faint-cry` | — | unchanged, `battleScriptSourceCommands.ts:923-927`; now proven reached inside the real KO chain too | `battleScriptPlayFaintCry.test.ts:76`; chain reach `battleScriptHitChainOpcode.test.ts:1456-1460` | emitted |
| **`faint-animation`** | `battler` | **NEW kind.** `B_SCR_OP_DOFAINTANIMATION` `battleScriptSourceCommands.ts:929-933` (opcode 26, registered this week) — `BtlController_EmitFaintAnimation`, `Cmd_dofaintanimation`'s only effect | unit: `battleScriptHitChainOpcode.test.ts:1209-1221`; chain reach: `:1476-1479` | **emitted (new)** |
| `hide-party-status-summary` | — | unchanged, `battleScriptSourceCommands.ts:935-939` | `battleScriptHidePartyStatusSummary.test.ts:173` | emitted |
| `set-battler-sprite-visibility` | `invisible` | `B_SCR_OP_MAKEVISIBLE` unchanged, `battleScriptSourceCommands.ts:941-949` (`invisible: false` only). **Moveend copy now source-complete, not just banked:** `battleScriptMoveEndControllers.ts:182-256` (`executeAttackerInvisible`/`executeAttackerVisible`/`executeTargetVisible`), dispatched for real by opcode 73's state loop via `executeControllerDelegatedState` at `battleScriptMoveEndOpcode.ts:237-253`/`:257-258` | `battleScriptMakeVisible.test.ts:176`; moveend-case unit: `battleScriptMoveEndControllers.test.ts:242` | emitted (MAKEVISIBLE); moveend path is **wired but only unit-tested directly** — no integration test yet drives a real semi-invulnerable/Dig/Fly scenario through opcode 73's own dispatch to this event (the KO-chain integration test only exercises the *non-firing* pass-through at these states) |
| `set-battler-status-data` | `status1` | thaw canceler unchanged, `battleScriptAttackCancelerOpcode.ts:190`. Moveend defrost case source-complete (same wiring note as above), `battleScriptMoveEndControllers.ts:133-180`. **NEW reachable site:** `cleareffectsonfaint` (opcode 27) `battleScriptHitChainOpcode.ts:1754-1903`, emits `status1: 0` when clearing a fainted battler's effects | thaw: `battleScriptAttackCancelerThaw.test.ts:246`; moveend-defrost unit: `battleScriptMoveEndControllers.test.ts:173`; **cleareffectsonfaint proven end-to-end**: `battleScriptHitChainOpcode.test.ts:1470-1476` | emitted; cleareffectsonfaint copy is **newly proven reachable this week**, moveend-defrost copy has the same unit-only caveat as sprite-visibility above |
| `set-battler-pp-data` | `movePosition`, `pp` | unchanged, `battleScriptHitChainOpcode.ts:710-722` | `battleScriptHitChainOpcode.test.ts:379` | emitted |
| `trainer-slide-in`/`-out` | — | unchanged, `battleScriptSourceCommands.ts:951-953` | `battleScriptTrainerSlide.test.ts:171` | emitted |
| `status-animation` | `isStatus2`, `status` | unchanged, `battleScriptSourceCommands.ts:955+`; preparation port now at `battleScriptRulesContext.ts:1722` (shifted from `:1583`, same mechanism) | `battleScriptStatusAnimation.test.ts:156` | emitted |
| `hp-change` | `from`, `to` | unchanged, `datahpupdate` `battleScriptHitChainOpcode.ts` (event site shifted a few lines from `:1356`→`:1386` band; same mechanism) | `battleScriptHitChainOpcode.test.ts:869,880` | emitted |
| `health-bar-update` | `healthValue` | unchanged, `healthbarupdate` `battleScriptHitChainOpcode.ts` (event ~`:1242`) | `battleScriptHitChainOpcode.test.ts:835` | emitted |
| `animation` | `animationId`, `battler`, `arguments` | unchanged, `attackanimation`/`hitanimation` `battleScriptHitChainOpcode.ts` (installs at `:1934`/`:1936`) | `battleScriptHitChainOpcode.test.ts:705,796` | emitted |
| `status-change` | `from`, `to` | **still none found in production.** Only in synthetic test fixtures that exercise the generic presentation-replay plumbing, not any real opcode: `tests/battleScriptRulesExecution.test.ts:40` | n/a (no production emitter) | **still declared, never emitted** |
| `stat-stage-change` | `stat`, `from`, `to` | **still none found.** Same synthetic-fixture-only pattern, `tests/battleScriptRulesExecution.test.ts:42-48` | n/a | **still declared, never emitted** |
| `switch` | `side`, `fromPartyIndex`, `toPartyIndex` | **still none found as this event kind.** `battleDecisionBoundary.ts:33-35`'s `kind: "switch"` is a *different, unrelated type* — `BattleSwitchDecision`, the player's own decision-request shape, not a `BattleScriptSemanticEventPayload` — do not conflate the two despite the identical literal. Only exercised via the synthetic fixture, `tests/battleScriptRulesExecution.test.ts:58-62` | n/a | **still declared, never emitted** |
| `outcome` | `outcome` | **still none found as this event kind.** `factoryBattleScriptTerminalDecision.ts:429`'s `kind: "terminal", outcome` is a *different, unrelated type* — the `BattleDecisionReducer`'s own boundary result (computed from `checkteamslost`'s `battleOutcome` field, one layer above the battle-script event stream), not this event union member. See §7.2 gap 1 | n/a | **still declared, never emitted** |

Confirmed via `grep -n 'kind: "<variant>"' src/engine/battleScript*.ts
src/engine/factoryBattleScript*.ts` per kind, then reading every hit; the
five pure-calculation hit-chain opcodes (`accuracycheck`, `critcalc`,
`damagecalc`, `typecalc`, `adjustnormaldamage`) still emit zero events, and
`battleScriptFaintedActionsOrchestration.ts`/`battleScriptCheckteamslostOpcode.ts`/
`battleScriptJumpifbyteOpcode.ts`/`battleScriptGetexpOpcode.ts` (this week's
four new modules) introduce **zero new event kinds** — the orchestration
module only forwards `priorState.events` from the opcodes it drives
(`battleScriptFaintedActionsOrchestration.ts:153`), and the three new
opcodes have no `events:` field anywhere in their handler bodies (grepped,
zero hits) — exactly matching PROGRESS #439/#440's own framing ("scheduling
logic and a selector role... not a 7th opcode").

**Evidence-over-inference correction:** §4's mapping table guessed the
fainted-line message would be `messageId: "STRINGID_FAINTED"`. Running the
now-reachable chain (`battleScriptHitChainOpcode.test.ts:1470-1476`) and
cross-checking the real source (`reference/pokeemerald/data/battle_scripts_1.s:2817-2823`,
`BattleScript_FaintTarget::`) shows the actual emitted constant is
**`STRINGID_TARGETFAINTED`** — `battleScene.ts`'s own comments (`:7424`,
`:11493`, `:12697`) use "`STRINGID_FAINTED`" as an informal template name,
which is not the real ROM constant. The test's assertion only pins
`messageId`, not `substitutions` (`expect.objectContaining`), so whether/how
"GROVYLE" would be spliced into that message remains unverified by any test
today — a fact worth carrying forward, not re-guessing.

### 7.2 Diff against §5's 8 named gaps + §4's 4 never-emitted kinds

1. **`outcome` event still never emitted.** Unaffected by the week's growth
   in the sense that mattered (the semantic event stream itself). But a
   closely adjacent piece landed: `factoryBattleScriptTerminalDecision.ts`
   now computes a real win/loss/draw value from `checkteamslost` and returns
   it as `{ kind: "terminal", outcome }` — a `BattleDecisionReducer`-level
   boundary result, one architectural layer above `BattleScriptSemanticEvent`.
   Nothing wires that value into the event stream today; a presentation
   consumer watching kernel *events* still sees nothing for an outcome. This
   is real, but it doesn't close the gap — it's the input the eventual fix
   would consume, not the fix. **Still open, kernel side** — narrower than
   last week (the outcome *value* now exists somewhere in the kernel;
   emitting it as an event is the remaining piece), but not closed.
2. **`switch` event still never emitted.** No change. The only new `"switch"`
   hit in the codebase this week is the unrelated `BattleSwitchDecision`
   type (`battleDecisionBoundary.ts`, a player command, pre-existing).
   **Still open, kernel side**, unaffected by this week's growth (which was
   entirely in the faint/outcome path, not the switch-decision path — no
   `HandleFaintedMonActions`-style loop exists yet for `BattleScript_HandleFaintedMon`'s
   own switch-in half).
3. **`status-change`/`stat-stage-change` still never emitted.** No change;
   this week's growth never touched status2/stat-stage machinery.
   **Still open, kernel side.**
4. **No tick/frame timestamp on any emitted event.** No change —
   `BattleScriptEventProvenance` (`battleScriptEvents.ts:1-9`) is
   byte-identical to §1's description (`programCounter`/`opcodeId`/
   `opcodeName`/`dispatcher`/`sourceLabel`/`sourceStatementLine`/
   `instructionExecution`). **Still open, kernel/schema side.**
5. **No production message-string resolver — narrowed, not closed.**
   `factoryBattleScriptTerminalDecision.ts:257-259` adds a *second*
   `prepareMessage` port implementation, generalized beyond
   `factoryBattleScriptDecision.ts`'s single hardcoded
   `STRINGID_PKMNFASTASLEEP` case: it now passes through **any**
   `STRINGID_*`-shaped expression as `messageId` — but `substitutions` is
   always `Object.freeze([])` (empty), and the port is local to one reducer
   file, not a shared/production string table. There is still no
   `STRINGID_* -> English text + substitution splice` resolver anywhere, and
   still nothing that would turn `STRINGID_TARGETFAINTED` into "Foe
   GROVYLE\nfainted!" — the fainted line, once emitted (see 7.1's
   correction), still needs this exact machinery. **Still open, kernel
   side**, marginally narrowed.
6. **`animation` payload still has no frame-by-frame choreography.** No
   change; out of this pass's scope as before (animation lane's own track).
   **Still open, kernel side** (or animation-lane side, per the scout's own
   caveat).
7. **`turn<N>Resolved` dispatch booleans still have no kernel-event
   counterpart.** No change — this was never going to be closed by kernel
   opcode registrations; it needs a scheduler/PC-to-window bridge that
   doesn't exist on either side. **Missing only on the presentation side**
   (a `battleScene.ts` consumption gap, not a kernel gap) — the kernel
   already exposes `programCounter`/`sourceLabel` via
   `BattleScriptEventProvenance`; nothing on the presentation side consumes
   it yet to answer "which window."
8. **Audio events still unverifiable by the pixel-only oracle.** No
   change, structural, independent of window choice.

### 7.3 Updated recommendation

`turn5-faint.json` is **still the smallest qualifying window** — nothing in
this week's growth added, removed, or resized a candidate (`battleScene.ts`
was not touched; §2-3's ranking depended only on leaf-function coupling,
which is presentation-side and unaffected by kernel opcode registrations).
Re-running §4's top-candidate table against today's kernel:

| turn-N input | today (was, per §4) | today (now) |
| --- | --- | --- |
| `turn4Resolved`/`turn5Resolved` dispatch booleans | no plausible mapping (gap 7) | **unchanged** — still no plausible mapping; still a presentation-side bridge gap, not kernel |
| `TURN5_ROCKSLIDE_PRESS_TICK` tick anchor | gap: no timestamp on events (gap 4) | **unchanged** — still open, kernel/schema side |
| `TURN5_FAINTED_LINE1`/`LINE2` text | kind emitted, but blocked on opcode 73 (unregistered) + no string resolver (gap 5); guessed `messageId: "STRINGID_FAINTED"` | **opcode-73 blocker is gone** — the fainted branch's `printstring` now executes for real, proven by `battleScriptHitChainOpcode.test.ts:1386-1483`. The messageId is `STRINGID_TARGETFAINTED` (corrected from §4's guess, §7.1). The string-table resolver (gap 5) is still the one open blocker for this input |
| "Grovyle's HP has reached 0" | strongest candidate — `hp-change`, `to: 0`, already emitted | **unchanged**, still the strongest candidate, still emitted (`battleScriptHitChainOpcode.ts`'s `datahpupdate`) |
| `turn5FaintedTextVisibleChars`/cursor-reveal tick math | not applicable (presentation-only) | **unchanged** |

**Ordered checkpoint plan for the next battle-lane worker** (acceptance:
the committed `turn5-faint.json` trace must still pass at **110/110**,
re-pinned live this session — §7.4):

1. Build the shared `STRINGID_* -> English text + substitution splice`
   resolver (gap 5) — the one blocker common to *every* message-kind event
   in every window, not specific to this one. Cover at least
   `STRINGID_TARGETFAINTED` (this window's own need) with its real
   substitution (battler nickname) once a resolver test can drive it.
2. Add a scheduler/PC-to-window bridge (gap 7) so a presentation consumer
   can answer "which window" from `BattleScriptEventProvenance`'s
   `programCounter`/`sourceLabel` instead of the hand-threaded
   `turn5Resolved`/`turn4Resolved` booleans. This is the dispatch-routing
   half; it is a `battleScene.ts` consumption concern, not a kernel opcode.
3. Wire `battleScene.ts`'s `drawTurn5RockSlideWindow` fainted branch
   (`:11654-11683`) to consume `hp-change{to:0}` (already available) and the
   resolved `STRINGID_TARGETFAINTED` message (from step 1) instead of its
   hardcoded literals, gated by step 2's bridge instead of the raw booleans.
4. Re-run `npm run compare -- turn5-faint.json` and confirm it still matches
   at **110/110** before/after — the checkpoint's actual acceptance bar.

Gap 4 (tick timestamp) is **not** on this window's critical path: this
window's only tick-keyed input (`TURN5_ROCKSLIDE_PRESS_TICK`) is a scroll/
cursor-reveal constant with no battle-content dependency (§4's own note),
so it can stay a presentation-local constant for this checkpoint; the
timestamp gap will bite the *next* window (`turn1-rockslide.json`'s
HP-interpolation tick anchor) but not this one.

### 7.4 Comparator re-pin

Ran `npm run compare -- turn5-faint.json --summary` from this worktree
against this lane's Battle Scene OFF oracle (`127.0.0.1:8014`):

```
110/110 frames matched -> tools/compare/out/latest
```

Matches the recorded count cited in §3/§6 (`docs/battle-turn-notes.md:4264`,
110/110) — re-pinned live, unaffected by the week's kernel growth (no
presentation code changed).

## 8. Prep-scout for the NEXT window, 2026-07-25 (`turn1-rockslide.json`)

Read-only recon plus one unwired staging module/test (no `battleScene.ts` or
other production edit — per this step's own brief). Consuming-worker task:
convert `turn1-rockslide.json` (`drawRockSlideWindow`/`drawRockSlideAttack`,
§3's runner-up) the same way the turn5-faint checkpoint converted its own
window. All line numbers below are re-verified against today's `HEAD`
(`e80bcb9`) — `battleScene.ts` grew from 17,056 to **17,519** lines since §2
was written, so every §4 line citation for this window has drifted (by
roughly +65 lines at the leaf, unrelated content elsewhere); the mechanism
itself is unchanged. `battleScriptEvents.ts`'s event union has also grown
again, from §7.1's 20 kinds to **22** (`draw-party-status-summary`,
`status-icon-update` — both unrelated to this window's own content, noted for
completeness, not analyzed further here).

### 8.1 Every input `turn1-rockslide.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing booleans/gates** — all in `drawFightSubmenuWindow`,
`battleScene.ts:5149-5330` (turn5-faint's own `turn4Resolved`/`turn5Resolved`
gate is a subset of this window's own larger gate chain):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn5Resolved` | `:5240` | false (else routes to `drawTurn6FightSubmenuWindow`) |
| `turn4Resolved` | `:5293` | false (else routes to `drawTurn5EndeavorText`) |
| `turn3Resolved` | `:5301` | false (else routes to `drawTurn4KickoffText`) |
| `turn2Resolved` | `:5309` | false (else routes to `drawTurn3EndeavorText`) |
| `sm.cursor` | `:5289` | `=== 0` (not `2`, else routes to `drawTurn2KickoffText`) |
| `sm.confirmElapsed` | `:5270` | not `null` |
| `t` vs `textStart` | `:5282-5283` | `t >= textStart` |
| `t - pressTick` vs `STATS_BANNER_END_DELAY` | `:5318` | `> 274` (else draws the DOUBLE_TEAM kickoff text + stats banner instead) |
| `pressTick` itself | `:5271`, `const pressTick = TICK0 + sm.confirmElapsed;` | **not turn-keyed** — derived from the player's own real A-confirm input tick, identically for every turn 1-12+ this dispatcher handles. Distinct from `TURN6_ROCKSLIDE_PRESS_TICK`-style per-turn hardcoded literals used only where the confirm/reopen flow diverges (different battler on-field, e.g. turn 6) |

Same class as turn5-faint's own gap-7 finding: scheduler/PC state, no
battle-content mapping is plausible for the boolean gates. `pressTick`
itself is the one exception worth flagging explicitly (§8.3).

**RAM-dump reads** — `battleScene.ts:670` imports
`battle1-turn1-ram-dump.json` (`battle1TurnRamDumpAsset`); read at:

| input | value | line(s) |
| --- | --- | --- |
| `anchorOpponentBattler.hp` | 143 (`before_turn.battler1.hp`) | `:940-942` |
| `anchorOpponentAfterTurnHp` | 101 (`after_turn.battler1.hp`) | `:944-946` |

Both feed `rockSlideOpponentHp(t, pressTick, startHp, endHp)` at the two
call sites `:11826` (`drawRockSlideAttack`) and `:11853`
(`drawTurnEndSettledMenu`).

**Hardcoded strings** — all in `battleMenu.ts`, all rendered by
`drawRockSlideWindow`'s own text-cycling branch (`battleScene.ts:11782-11800`,
three boxes shown in sequence as `t` advances past each one's own start tick):

| input | literal | line(s) |
| --- | --- | --- |
| `TURN_KICKOFF_LINE1`/`LINE2` | "Foe GROVYLE used" / "DOUBLE TEAM!" | `battleMenu.ts:1086,1088` |
| `STAT_ROSE_LINE1`/`LINE2` | "Foe GROVYLE's evasiveness" / "rose!" | `:1592-1593` |
| `ROCK_SLIDE_LINE1`/`LINE2` | "ONIX used" / "ROCK SLIDE!" | `:1611-1612` |

**Tick anchors** (all `pressTick`-relative offsets, `battleMenu.ts`):
`STATS_BANNER_END_DELAY`=274 (`:1254`), `STAT_ROSE_TEXT_DELAY`=284 (`:1597`),
`ROCK_SLIDE_TEXT_DELAY`=393 (`:1616`), `ROCK_SLIDE_RAM_ANCHOR_DELAY`=428
(`:1640`, the shake+first-rock anchor), `HIT_FLASH_RAM_ANCHOR_DELAY`=562
(`:2095`), `ROCK_SLIDE_HP_DRAIN_START_DELAY`=597 (`:2203`),
`ROCK_SLIDE_TEXT_CLEAR_DELAY`=657 (`:2223`), `ROCK_SLIDE_MENU_REDRAW_DELAY`=664
(`:2224`).

**Sprite/animation cues** (all pure `(t, pressTick, ...)` functions,
`battleMenu.ts`, called from `drawRockSlideAttack`/`drawTurnEndSettledMenu`,
`battleScene.ts:11818-11855`): `rockSlideBg3Y` (BG3 shake, `:1674`),
`rockSlideRockState`/`rockSlideDrawOrder` (20 falling rocks + real draw
order, `:1771`/`:2042`), `rockSlideMonShakeY2` (Grovyle's own shake,
`:2082`), `rockSlideHealthboxWobbleY2` (`:2098`), `rockSlideMonBlinkInvisible`
(`:2109`), `rockSlideOpponentHp` (HP-bar interpolation, `:2205`),
`rockSlideResettledBounceTick` (`:2243`).

This matches §4's runner-up table's own enumeration almost exactly (only
line numbers drifted, plus `TURN_KICKOFF_LINE1/2` made explicit here as a
third text box the same leaf function cycles through, which §4's table
folded into "dispatch routing" rather than listing as its own message
input).

### 8.2 Staged proof: what the kernel emits today for this window's own content

`src/engine/turn1RockSlidePresentationStaging.ts` (new, **unwired** — not
imported by `battleScene.ts` or any production file) mirrors
`turn5FaintPresentationStaging.ts`'s pattern exactly: stage a real hit chain
to `BattleScript_HitFromAtkCanceler`'s own `end`, capture every emitted
event. Unlike turn5's own staging (which had to substitute MOVE_STRENGTH for
ROCK_SLIDE — PROGRESS #442's `ppreduce` Pressure fix hadn't landed yet), this
run stages the **real** MOVE_ROCK_SLIDE (id 157) against Grovyle's real turn-1
HP (143), Onix/Grovyle's real level-50 stats
(`tests/damageCalc.test.ts`'s own `ONIX`/`GROVYLE` blocks), singles, no
Pressure on either side — proven runnable end-to-end in singles by
`tests/battleScriptHitChainOpcode.test.ts:2050-2125`'s own "RUNG 1 leverage"
test, reused here as the precedent. `tests/turn1RockSlidePresentationStaging.test.ts`
(new, 7 passing assertions) pins the result — verified live this session, not
guessed:

```
targetHpAfter: 97   (this run's own RNG draw; real turn 1 settles 143 -> 101 —
                      different roll, same real formula, same "Grovyle
                      survives" shape)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE", substitutions:[]}
  set-battler-pp-data           {battler:0, movePosition:0, pp:9}
  animation                     {animationId:"MOVE_ANIMATION", battler:0, arguments:["157","0","75","46","0","0"]}
  play-se                       {battler:1, songId:13}   (SE_EFFECTIVE)
  animation                     {animationId:"HIT_ANIMATION", battler:1, arguments:[]}
  health-bar-update             {battler:1, healthValue:46}
  hp-change                     {battler:1, from:143, to:97}
  set-battler-sprite-visibility {battler:0, invisible:false}   (moveend pass-through)
  set-battler-sprite-visibility {battler:1, invisible:false}   (moveend pass-through)
```

One correction to §4's own guess, found by running the real chain rather than
reading the opcode source alone (same "evidence over inference" discipline
§7.1 established for `STRINGID_TARGETFAINTED`): **`health-bar-update`'s
`healthValue` is the damage DELTA (`from - to`, 46), not the settled end HP.**
§4 did not make a claim here (it only said the kind "is emitted today"), but
a naive reading of the field name invites exactly this wrong guess — pinned
by a dedicated test assertion (`healthBarUpdate.healthValue ===
hpChange.from - hpChange.to`) so the next worker does not have to re-derive
it. `rockSlideOpponentHp`'s own two endpoints must come from `hp-change`'s
`from`/`to`, not from `health-bar-update`.

### 8.3 Mapping table (turn-N input -> kernel event / gap), current as of this staged run

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn2Resolved`/`turn3Resolved`/`turn4Resolved`/`turn5Resolved`/`sm.cursor` dispatch gates | none — scheduler/PC state | **no plausible mapping**, same gap-7 class as turn5-faint's own dispatch gate. The turn5 precedent's fix (`presentationEventWindowBridge.ts`, keyed on `provenance.sourceLabel`) generalizes here: my staged run's own events carry `sourceLabel: "BattleScript_HitFromAtkString"` / `"BattleScript_HitFromAtkAnimation"` (verified in the raw event dump, not guessed) — a ROCK_SLIDE-window bridge keys off this label family instead of the fainted-branch's `BattleScript_FaintTarget`, same mechanism, different label |
| `pressTick` (`TICK0 + sm.confirmElapsed`) | n/a | **not a kernel gap at all** — already presentation-native and already non-turn-keyed (§8.1's own finding). No kernel timestamp is needed to keep every `rockSlide*` helper working; see §8.4 |
| `anchorOpponentBattler.hp` (143, RAM dump) | `hp-change`'s `from` | **emitted today, proven**: my staged run's own event has `from: 143` |
| `anchorOpponentAfterTurnHp` (101, RAM dump) | `hp-change`'s `to` | **emitted today, proven** (my run's own real hit gives `to: 97`, a different genuine roll — same field, same mechanism) |
| `rockSlideOpponentHp(t, pressTick, startHp, endHp)` interpolation | `hp-change{from,to}` as the two endpoints, `pressTick` unchanged as the timing anchor | **fully unblocked** once step 3 of §8.5 lands — no gap-4 kernel growth needed for this window (§8.4) |
| `ROCK_SLIDE_LINE1`/`LINE2` ("ONIX used\nROCK SLIDE!") | `message{messageId:"STRINGID_USEDMOVE"}` | **kind AND messageId emitted today, proven**. Template (`battle-message-templates.json`'s `usedMove` entry, read via `battleStringResolver.ts`): `"{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}"`. `B_ATK_NAME_WITH_PREFIX` already has a resolver (`resolveBattleNameWithPrefix`, gap 5's turn5 precedent). `B_BUFF2` ("ROCK SLIDE!", the move's own display name + "!") has **no resolver yet** — narrow, concrete, new: `src/data/gen/moves.json`'s own already-extracted `name` field supplies it (`moves[157].name === "ROCK SLIDE"`), so this is a one-function addition, not new extraction |
| `TURN_KICKOFF_LINE1`/`LINE2` ("Foe GROVYLE used\nDOUBLE TEAM!") | `message{messageId:"STRINGID_USEDMOVE"}` | **mechanically identical mapping to the row above** — same opcode (`attackstring`), same fixed `STRINGID_USEDMOVE` operand regardless of which move is used (confirmed at the handler, `battleScriptHitChainOpcode.ts:754-757`) — not independently staged (would need Grovyle's own DOUBLE_TEAM hit chain, a different entry point/script; the *mechanism* proof carries over without restaging it) |
| `STAT_ROSE_LINE1`/`LINE2` ("Foe GROVYLE's evasiveness rose!") | `stat-stage-change` | **still a named gap, unchanged from §5/§7.2 #3, re-confirmed this session**: zero production emission sites anywhere in the kernel (re-grepped fresh, same result as §7.1). My own staged test asserts this explicitly (`events.some(e => e.kind === "stat-stage-change") === false`) so the absence is pinned, not merely claimed. **No staged scenario could produce this kind today, ROCK_SLIDE or DOUBLE_TEAM** — this is real pre-work for the main-lane step, not something this scout could route around |
| `rockSlideBg3Y`/`rockSlideRockState`/`rockSlideMonBlinkInvisible`/`rockSlideHealthboxWobbleY2`/`rockSlideMonShakeY2` (shake + falling-rock + wobble + blink choreography) | `animation{animationId:"MOVE_ANIMATION"/"HIT_ANIMATION"}` | **kind emitted today, proven** — my staged run's own `attackanimation` payload is `arguments:["157","0","75","46","0","0"]` (move id, anim-turn counter, power, real computed damage, friendship, multihit — all real values from this run, not placeholders). **Gap 6 unchanged**: no frame-by-frame choreography in the payload; the ~10 `rockSlide*` helpers hold 100% of the shake/rock/wobble/blink motion by hand, and nothing in the event stream could reproduce it |
| effectiveness SFX (`SE_EFFECTIVE`, songId 13) | `play-se` | **emitted today, proven** (my run: `songId:13`). Still moot for this checkpoint's own oracle (pixel-only, gap 8, unchanged) |
| `currentPPForActiveMon`'s ROCK_SLIDE PP readout (used by LATER turns' own FIGHT submenu, not this window's own render) | `set-battler-pp-data` | **emitted today, proven** (my run: `movePosition:0, pp:9`, i.e. 10->9) — not in §4's own table (that table only covered this window's own leaf content), added here because it is a real input this same hit chain's event stream carries, relevant to whichever window converts the PP display next |

### 8.4 Gap 4 (tick timestamp), re-scoped for this window — evidence and options, not production code

§5/§7.2 named gap 4 as "no tick/frame timestamp on any emitted event,"
blocking "the timing half of every single-window mapping." Digging into
*this* window's own timing code changes that framing:

**Finding, evidenced above:** `pressTick` — the one quantity every
`rockSlide*` helper actually keys its own tick math to — is **not** sourced
from turn-N state or from any kernel event. It is `TICK0 + sm.confirmElapsed`
(`battleScene.ts:5271`), where `sm.confirmElapsed` is `FightSubmenuState`'s
own field recording *when the player's real A-press confirmed the menu* —
already a single, non-turn-keyed presentation-input quantity used
identically by every turn this dispatcher handles (turns 1 through 12+, not
just turn 1). The kernel's own `BattleScriptEventProvenance`
(`battleScriptEvents.ts:1-9`, still `programCounter`/`opcodeId`/
`opcodeName`/`dispatcher`/`sourceLabel`/`sourceStatementLine`/
`instructionExecution` — unchanged since §7.2, re-confirmed by grep this
session) has no tick/frame field, and **grepping `src/engine/
battleScriptMachine.ts`, `battleScriptEvents.ts`, `battleDecisionBoundary.ts`
for `tick`/`frame` finds zero hits** — the kernel has no clock concept of any
kind, only an instruction-execution counter. That is a genuine unit mismatch
against the oracle's hardware VBlank tick, not just a missing field: adding a
raw number wouldn't by itself answer "which unit."

**Option A (recommended, source-faithful, zero kernel schema change):** keep
`pressTick` exactly as-is (presentation-native, input-derived) and only
replace the two RAM-dump HP literals with `hp-change`'s `from`/`to` fields
(§8.3's own row). This works today because — per this checkpoint's own
established architecture (`turn5FaintPresentationStaging.ts`'s own doc
comment: "kernel runs at staging time; presentation reads the event list")
— the kernel's hit chain is not stepped in lockstep with the render tick
counter; it is staged once, ahead of time, and its event list is read
whenever presentation needs it. `pressTick` answers "when did I, presentation,
start showing this window," which is a question the kernel was never going to
answer regardless of schema — the two clocks are already architecturally
decoupled by this checkpoint's own design, not accidentally missing a bridge.
Evidence for this option costing nothing: every `rockSlide*` helper is
already a pure `(t, pressTick, ...)` function; none of them need to change
signature or behavior under this option.

**Option B (schema growth, only if a FUTURE window's timing genuinely can't
be presentation-derived):** add an opaque, kernel-native sequencing field to
`BattleScriptEventProvenance` (`instructionExecution` already exists and is
monotonic — a candidate to key off of instead of a new field) and have
presentation derive its own local tick anchor the first time it observes a
given `instructionExecution` value, caching that mapping locally (never
sourced from the kernel's own clock, since it has none). This is strictly
more machinery than Option A and this scout found no window (turn5-faint or
turn1-rockslide) that actually needs it — flagged only because the brief
asked for options, not because evidence favors it here.

**Recommendation:** Option A. Gap 4, as named in §5/§7.2, is not on
`turn1-rockslide.json`'s critical path either (matching turn5-faint's own
§7.3 conclusion, for a related but distinct reason — there the tick input
was presentation-only chrome with no battle content; here the tick input
turns out to already be a correctly-generalized presentation-native quantity
with no kernel dependency at all). Downgrade gap 4 to "open, but unconfirmed
to block any window examined so far by either scout pass" rather than
re-citing it as a blocker without qualification.

### 8.5 Ordered wiring plan (acceptance: `turn1-rockslide.json` still passes at 256/256)

1. Add a `B_BUFF2` placeholder resolver to `battleStringResolver.ts`
   (move id -> `${moves.json[id].name}!`, e.g. `MOVE_ROCK_SLIDE` (157) ->
   `"ROCK SLIDE!"`) alongside the already-existing
   `resolveBattleNameWithPrefix` (`B_ATK_NAME_WITH_PREFIX`) — together these
   resolve `STRINGID_USEDMOVE` for both this window's `ROCK_SLIDE_LINE1/2`
   and (mechanically free, same messageId) `TURN_KICKOFF_LINE1/2`.
2. Add a `resolveRockSlidePresentationWindowContent`-shaped sibling to
   `presentationEventWindowBridge.ts` (same null-safe "every required signal
   present" pattern as `resolveFaintPresentationWindowContent`), keyed on
   `provenance.sourceLabel` from the `BattleScript_HitFromAtkString`/
   `BattleScript_HitFromAtkAnimation` family (confirmed by this scout's own
   staged event dump, §8.2) instead of `turn2Resolved`..`turn5Resolved`/
   `sm.cursor`.
3. Wire `drawRockSlideWindow`/`drawRockSlideAttack`
   (`battleScene.ts:11771-11836`) to source `startHp`/`endHp` from
   `hp-change{from,to}` (replacing `anchorOpponentBattler.hp`/
   `anchorOpponentAfterTurnHp`'s RAM-dump reads, `:940-946`) and
   `ROCK_SLIDE_LINE1/2`'s text from step 1's resolved message, gated by step
   2's bridge — every `rockSlide*` choreography helper stays byte-for-byte
   unchanged (§8.4 Option A: `pressTick` needs no kernel input). The
   `STAT_ROSE_LINE1/2` box stays a hardcoded literal for this pass (gap
   unchanged, §8.3) — same "narrow the checkpoint to what's actually
   unblocked" discipline turn5-faint's own plan used for its dispatch gate.
4. Re-run `npm run compare -- turn1-rockslide.json` and confirm it still
   matches at **256/256** (recorded count, `docs/battle-turn-notes.md:5470`)
   before/after — the checkpoint's own acceptance bar.

### 8.6 Comparator re-pin

Ran both live this session, from this worktree, against this lane's Battle
Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-faint.json --summary
110/110 frames matched -> tools/compare/out/latest
```

`turn1-rockslide.json` matches its recorded count (`docs/battle-turn-
notes.md:5470`, 256/256) — re-pinned live, confirming this scout's own
read-only recon (plus the new unwired staging module) touched nothing live.
`turn5-faint.json` re-confirms 110/110 (unchanged from §7.4), proving the
already-landed checkpoint conversion is untouched by this session's work.

## 9. Prep-scout for the NEXT window, 2026-07-26 (`turn5-rockslide.json`)

Read-only recon plus one unwired staging module/test (no `battleScene.ts` or
other production edit — same contract §8 used for `turn1-rockslide.json`,
which landed on the first wiring try). Since §8 was written, **both windows
it and §7 scouted have actually been wired into production**: `battleScene.ts`
now imports `resolveTurn5FaintWindowLines` (`turn5FaintPresentationStaging.ts`)
and `resolveTurn1RockSlideAttackLines`/`resolveTurn1DoubleTeamKickoffLines`/
`resolveTurn1RockSlideHpEndpoints` (`turn1RockSlidePresentationStaging.ts`) at
`battleScene.ts:589-593`, consumed at `:7506` and `:11805-11807`. Both re-pin
at their recorded counts live (§9.5). `battleScene.ts` grew from 17,519 lines
(§8) to **17,888**; `battleScriptEvents.ts`'s event union is unchanged at 22
kinds since §8.

This window is `drawTurn5EndeavorText` (`battleScene.ts:6935-6949`) handing
off into `drawTurn5RockSlideWindow`'s own attack branch
(`battleScene.ts:11735-11764`, the `t < faintedStart` branch at `:11740-11743`)
— **not yet wired**: `drawTurn5RockSlideWindow`'s attack branch still draws
the raw hardcoded `ROCK_SLIDE_LINE1`/`ROCK_SLIDE_LINE2` (`battleMenu.ts:1611-1612`),
not the resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2` constants window 2 already
proved.

### 9.1 Every input `turn5-rockslide.json` consumes today (re-verified against `HEAD`, commit `0c7408f`)

**Dispatch-routing booleans/gates** reaching `drawTurn5EndeavorText`, all in
`drawFightSubmenuWindow` (`battleScene.ts:5160-5414`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn14Resolved`…`turn6Resolved` | `:5180-5255` | all false (else routes to turns 15/14/13/…/7's own dedicated dispatchers) |
| `turn5Resolved` (outer) | `:5256` | false (else routes to `drawTurn6FightSubmenuWindow` — turn 6 is genuinely a different base scene, Pidgeotto not Grovyle) |
| `sm.openElapsed`/`sm.closeElapsed` | `:5265,5279` | both past their own DMA-wait windows (ordinary settled-submenu path) |
| `sm.confirmElapsed !== null` | `:5286` | true (a real A-confirm press already landed) |
| `inTurn4DoubleTeamWindow = turn3Resolved && !turn4Resolved` | `:5297` | irrelevant once `turn4Resolved` is true (see below) — only distinguishes turn 4's own window |
| `t >= textStart` | `:5298-5299` | true (message has started) |
| `sm.cursor === 2` | `:5305` | false (cursor rests on ROCK_SLIDE, slot 0, not DRAGON_BREATH) |
| `turn4Resolved` | `:5309` | **true** — this is the one boolean that actually selects this window (`drawTurn5EndeavorText(fb, t, pressTick)`, `:5314`); every check above it is a false/pass-through gate |

Same class as §8.1's own finding: scheduler/PC state, no battle-content
mapping is plausible for any of these gates.

**RAM-dump / HP-constant reads.** The brief's own framing ("2-3
RAM-dump-constant reads — `anchorPlayerAfterTurn3Hp`/`anchorPlayerAfterTurn5Hp`/
`anchorOpponentAfterTurn4Hp`") is **only partially right, corrected here by
reading each constant's own definition** (`battleScene.ts:1285-1364`), same
"evidence over inference" discipline §7.1 already established:

| constant | value | real source | line(s) |
| --- | --- | --- | --- |
| `anchorPlayerAfterTurn3Hp` | 88 | **is** an asset read — but from `battle1-grovyle-faint-ram-dump.json` (`battle1GrovyleFaintRamDumpAsset`), field `battlerSnapshots["4892"].battler0.hp` — **not** `battle1TurnRamDumpAsset` as the brief's framing implied | `:1327-1329` |
| `anchorPlayerAfterTurn5Hp` | 1 | a **hardcoded literal**, not an asset read at all — sourced from an uncommitted `tools/probe/ram-probe.py` run this doc comment cites (`src/data/gen/turn5-endeavor-watch-probe.json`, which exists on disk but is never imported by any `.ts` file, confirmed by a fresh grep this session) | `:1355-1364` |
| `anchorOpponentAfterTurn4Hp` | 1 | also a **hardcoded literal**, same uncommitted-probe provenance, no JSON import | `:1344-1355` |
| `anchorOpponentAfterTurn5Hp` | 0 | **a fourth constant the brief's own "2-3" estimate missed entirely** — also a hardcoded literal (`:6969-6970`), Grovyle's real turn-5 END hp (the faint) | `:6969-6970` |

So of the four HP constants this window's full render path actually touches,
**zero** are `battle1TurnRamDumpAsset` fields (the brief's own named asset);
one is asset-backed (a *different* asset), and three are bare literals whose
only paper trail is a doc-comment citation to an uncommitted probe JSON.

**The hidden-state finding this brief explicitly asked to flag (§2's own
dispatcher warning, re-confirmed here):** `drawTurn5RockSlideWindow(fb, t)`
— a plain 2-arg call — unconditionally calls `drawTurn6FieldBase(fb, t)` at
its very first line (`:11737`), which itself (via its own defaulted
parameters, `:11711`) calls `drawTurn5RockSlideAttack(fb, t, ...)` (`:11712`).
That function independently reads a **fourth HP-interpolation call**,
`rockSlideOpponentHp(t, pressTick, anchorOpponentAfterTurn4Hp,
anchorOpponentAfterTurn5Hp)` (`:7483`) — Grovyle's own opponent-healthbox
drain, a completely separate interpolation from `drawTurn5EndeavorText`'s own
`endeavorOnixHp(t, pressTick, anchorPlayerAfterTurn3Hp, anchorPlayerAfterTurn5Hp)`
(`:6941`, Onix's player-side healthbox). **Concretely, this means Grovyle's
sprite is already mid-faint-sink during part of the attack branch's own
active window**: `GROVYLE_FAINT_SINK_START_TICK` = 6502 (`:6995`,
`grovyleFaintSinkRowsAndY2`, called unconditionally at `:7407`) falls
*inside* the attack branch's own `[rockSlideTextStartTick(5829)=6222,
turn5FaintedTextStartTick(5829)=6523)` window (`:6936`, `:7515-7517`) — so for
render ticks 6502-6522 (21 of this branch's ~300 active ticks), the "ONIX
used\nROCK SLIDE!" text is still being held while Grovyle's own sprite is
already erasing/shifting underneath it. `drawTurn6FieldBase(fb, t)` also
threads `turn5SitrusOnixHp(t)` (its own default parameter, `:11711`) as
Onix's on-field healthbox HP — a tick-keyed formula (`heldItemHeal.ts:134-144`,
`sitrusDisplayedHpAtAge`) that floors at `TURN5_SITRUS_HEAL_HP_START=1`
(`:7290`) for every tick before its own much-later climb begins, which is
every tick in this branch's own window — a **third, independent** path that
happens to reproduce the same "Onix settled at 1 HP" fact `anchorPlayerAfterTurn5Hp`
encodes directly, duplicated rather than shared. None of this is reachable
from `drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s own two-argument
signatures without walking two more levels of defaulted-parameter call
chains — exactly the "reads more hidden state than its declaration suggests"
shape §2 named.

**Hardcoded strings:**

| input | literal | line(s) |
| --- | --- | --- |
| `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` | "Foe GROVYLE used" / "ENDEAVOR!" | `battleMenu.ts:1086`, `:2635` (drawn by `drawTurn5EndeavorText`, `:6948`) |
| `ROCK_SLIDE_LINE1`/`ROCK_SLIDE_LINE2` | "ONIX used" / "ROCK SLIDE!" | `battleMenu.ts:1611-1612` (drawn by `drawTurn5RockSlideWindow`'s attack branch, `:11741`) — **identical text** to window 2's own already-resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2`, but this call site still uses the raw literals, not the resolver |

**Tick anchors / stale-power literal:** `TURN5_ROCKSLIDE_PRESS_TICK=5829`
(synthetic anchor, `:6967`), `ROCK_SLIDE_MOVE_POWER=75` (stale-power shake
input, `:5848`, unrelated to ENDEAVOR's own 0 listed power — see `endeavorShakeSteps`'s
own doc, `:5852`), `turn5FaintedTextStartTick`/`rockSlideTextStartTick`
(delay constants, `:7515-7517`, `battleMenu.ts:1618-1624`).

**Sprite/animation cues** (pure `(t, pressTick, ...)` functions, unchanged
mechanism from §8's own runner-up window, reused verbatim by
`drawTurn5RockSlideAttack`): `rockSlideBg3Y`, `rockSlideMonBlinkInvisible`,
`rockSlideMonShakeY2`, `rockSlideHealthboxWobbleY2`, `rockSlideDrawOrder`/
`rockSlideRockState`, plus `drawEndeavorSquish`'s own ENDEAVOR-specific
choreography (`endeavorShakeX2`, `drawEndeavorHitsplats`, `endeavorHealthboxBounceY2`,
`ENDEAVOR_SQUISH_TABLE`-driven affine stretch, `drawEndeavorDroplets`) —
none of this choreography is this scout's concern beyond confirming gap 6
(§5/§7.2, no frame-by-frame payload in the `animation` event) still applies
unchanged.

### 9.2 Staged proof: what the kernel emits today for this window's own content

**`EFFECT_ENDEAVOR` is not executable today**, confirmed live by
regenerating the census this session (`npx tsx tools/report/executable-frontier-census.ts`,
zero diff to the committed file — still 76/214 effects):
`docs/executable-frontier-census.md:245` — `blocked-on-opcodes`, missing
`B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`, `B_SCR_OP_BICBYTE`,
`B_SCR_OP_ADJUSTSETDAMAGE` on its main path. Confirmed against the real
source (`reference/pokeemerald/data/battle_scripts_1.s:2479-2491`,
`BattleScript_EffectEndeavor::`): `attackcanceler`, `attackstring`,
`ppreduce`, `setdamagetohealthdifference` (**missing**), `copyword`,
`accuracycheck`, `typecalc`, `jumpifmovehadnoeffect`, `bicbyte` (**missing**),
`copyword`, `adjustsetdamage` (**missing**), then `goto
BattleScript_HitFromAtkAnimation` — the same generic tail label window 2's
own ROCK_SLIDE chain already proved reachable.

**Nearest executable equivalent, staged this session:**
`src/engine/turn5EndeavorPresentationStaging.ts` (new, **unwired**), mirrors
`turn5FaintPresentationStaging.ts`'s own precedent of substituting an
executable move when the real one is blocked (that module substituted
MOVE_STRENGTH for MOVE_ROCK_SLIDE against a *different* opcode gap). Here:
MOVE_STRENGTH (id 70, `EFFECT_HIT`, 100% accuracy, `MOVE_TARGET_SELECTED`)
with **Grovyle as attacker (side 1) and Onix as target (side 0)** — the
opposite direction from every prior staging module in this file family
(`turn1RockSlidePresentationStaging.ts` and `turn5FaintPresentationStaging.ts`
only ever staged Onix-attacks-Grovyle). Real level-50 stats for both
(`tests/damageCalc.test.ts`'s own `ONIX`/`GROVYLE` blocks, same as every
sibling module); Onix (target) starts at 88 HP (`anchorPlayerAfterTurn3Hp`,
this window's own real drain-start anchor); Grovyle (attacker) is at 1 HP
(`anchorOpponentAfterTurn4Hp`, this window's own real steady value). RNG
seed reused verbatim from `turn5FaintPresentationStaging.ts`'s own
`KO_HIT_SEED` (919694434), already proven live to clear a 100%-accuracy
check in this program. `tests/turn5EndeavorPresentationStaging.test.ts` (new,
7 passing assertions) pins the live result — run this session, not guessed:

```
targetHpAfter: 79   (88 -> 79, real NORMAL-vs-ROCK/GROUND not-very-effective
                      formula — genuinely computed, not copied: confirmed by
                      the extra STRINGID_NOTVERYEFFECTIVE resultmessage
                      window 2's own neutral-effectiveness chain never emits)
event kinds, in order:
  message           {messageId:"STRINGID_USEDMOVE"}       sourceLabel: BattleScript_HitFromAtkString
  set-battler-pp-data
  animation         MOVE_ANIMATION
  play-se
  animation         HIT_ANIMATION
  health-bar-update
  hp-change         {battler:0, from:88, to:79}            sourceLabel: BattleScript_HitFromAtkAnimation
  message           {messageId:"STRINGID_NOTVERYEFFECTIVE"}
  set-battler-sprite-visibility  (attacker)
  set-battler-sprite-visibility  (target)
```

`presentationEventWindowBridge.ts`'s existing `resolveRockSlidePresentationWindowContent`
(built for window 2, keyed only on `sourceLabel`, never on `side`) resolves
this run's own message+hp-change pair **unchanged, zero bridge edits needed**
— proven, not assumed (`resolveTurn5EndeavorWindowContent()` in the new
module calls it directly; the test asserts it returns non-null and the right
values). The kickoff message resolves to `["Foe GROVYLE used", "STRENGTH!"]`
— the real "Foe " opponent-side prefix (`HANDLE_NICKNAME_STRING_CASE`,
`battleStringResolver.ts:52-55`) live for the first time this session, not
merely claimed "mechanically identical" by analogy the way window 2's own
`TURN_KICKOFF_LINE1/2` was (§8.3's own row).

**What this staged run does and does not prove:** it proves the
`message`+`hp-change` *mechanism* — attacker-name resolution, prefix
selection, `hp-change` on the correct (target) battler index, the bridge's
own label-matching — generalizes to an opponent-attacks-player direction
this session's evidence had never exercised live before. It does **not**
prove anything about ENDEAVOR's own damage formula (`calculateEndeavorDamage`/
`resolveEndeavorDamage`, `damageCalc.ts:291-312` — already ported as pure
functions, unreachable from the script machine only because the three
opcodes above aren't registered) — that gap is real, precisely named, and
not routed around.

### 9.3 Mapping table (turn-N input -> kernel event / gap), current as of this staged run

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn6Resolved`…`turn4Resolved` dispatch gates (§9.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found. The turn1-rockslide precedent's bridge mechanism (key off `provenance.sourceLabel`) generalizes here too — no new bridge design needed, only a new call site |
| `anchorPlayerAfterTurn3Hp` (88) | `hp-change`'s `from`, staged proof: **confirmed**, `battler:0, from:88` | **mechanism proven this session** (§9.2) — but only via the MOVE_STRENGTH substitute, not the real ENDEAVOR script |
| `anchorPlayerAfterTurn5Hp` (1) | `hp-change`'s `to` | **blocked on the real gap**: the substitute run's own `to` (79) is NOT ENDEAVOR's real settle (1) — this endpoint specifically needs `EFFECT_ENDEAVOR` itself registered (3 missing opcodes, §9.2), not just the message/hp-change mechanism, which is otherwise ready |
| `anchorOpponentAfterTurn4Hp` (1) used as `drawEndeavorSquish`'s "opponent healthbox during this window" HP | not directly an `hp-change` endpoint in the real ENDEAVOR chain (Grovyle's HP never changes during turn 5's ENDEAVOR — it's the ATTACKER) — this is a steady-state read, not a drain endpoint | **no kernel event needed at all for this specific read**: Grovyle's HP is simply whatever the rules-context battler array already holds from the prior turn, which a real kernel-driven presentation layer would read from battler state directly, not from a dedicated event |
| `anchorOpponentAfterTurn4Hp`/`anchorOpponentAfterTurn5Hp` pair, `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp` interpolation (§9.1's hidden-state finding) | `hp-change{from,to}` on Grovyle (battler 1) — this is turn 5's OWN ROCK_SLIDE-from-turn-4-onward steady/settle read, a **different** hit chain than ENDEAVOR (it's turn 4's already-real ROCK_SLIDE settle carried forward, then turn 5's own separate fatal hit at the very end of the full window past this branch) | **partially available**: turn 4's own settle (`anchorOpponentAfterTurn4Hp`) has no staged proof yet (no turn-4 module exists); turn 5's own fatal ROCK_SLIDE hit (`anchorOpponentAfterTurn5Hp=0`) is exactly `turn5FaintPresentationStaging.ts`'s own already-staged/tested KO chain (`hp-change{to:0}`) — **already proven**, just not yet wired to this specific `rockSlideOpponentHp` call site |
| `ROCK_SLIDE_LINE1`/`LINE2` ("ONIX used\nROCK SLIDE!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, already resolved** — this is byte-identical content to window 2's own `TURN1_ROCKSLIDE_ATTACK_LINE1/2` (`turn1RockSlidePresentationStaging.ts:257-264`); no new staging needed, just a new call site pointed at the existing resolver functions |
| `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` ("Foe GROVYLE used\nENDEAVOR!") | `message{messageId:"STRINGID_USEDMOVE"}` | **kind+messageId mechanism proven this session** (§9.2's staged run, opponent-attacker direction) but the REAL line 2 ("ENDEAVOR!") needs `resolveMoveNameExclaim(MOVE_ENDEAVOR)` off a REAL Endeavor chain to be source-faithful — the substitute run's own "STRENGTH!" is not swappable in-place without either (a) accepting the substitute's own move name for this text (wrong pixels) or (b) registering the 3 missing opcodes first |
| `drawEndeavorSquish`'s own squish/hitsplat/shake choreography | `animation{animationId:"MOVE_ANIMATION"}` | **kind emitted, proven** (§9.2's own `animation` events) — gap 6 (§5/§7.2, no frame-by-frame payload) unchanged, same as every prior window |
| `turn5SitrusOnixHp(t)`'s hidden floor-at-1 read (§9.1's third hidden-state path) | `hp-change`'s settled `to` value, once available (same value `anchorPlayerAfterTurn5Hp` already needs) | **same blocker as the direct read** — not an independent gap, just a second consumer of the identical missing ENDEAVOR settle |
| `Grovyle mid-faint-sink during ticks 6502-6522` (§9.1's concrete finding) | `faint-animation`/sprite-visibility events, already emitted (`battleScriptHitChainOpcode.ts`, per §7.1's table) via `turn5FaintPresentationStaging.ts`'s own already-staged KO chain | **already proven reachable** (a different, already-landed staging module) — this window's own wiring would need to consume that SAME staged result at an EARLIER point in its own timeline than the fainted-branch window does, a sequencing detail for the wiring step, not a new kernel gap |

### 9.4 Ordered wiring plan (acceptance: `turn5-rockslide.json` still passes at 256/256, regression sweep over turn3-6 traces unchanged)

1. Register `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`, `B_SCR_OP_BICBYTE`,
   `B_SCR_OP_ADJUSTSETDAMAGE` (§9.2) — this is the one REAL kernel gap this
   window's own Endeavor content is blocked on; `damageCalc.ts:291-312`
   already has the pure formula ported, so this is opcode wiring, not new
   damage math. Out of THIS scout's own scope (no `src/` production edits
   permitted here), but the single highest-leverage next step for the
   wiring worker — without it, step 3 below cannot use the REAL ENDEAVOR
   chain and must keep the MOVE_STRENGTH substitute (wrong move name in the
   rendered text).
2. Once (1) lands, replace `turn5EndeavorPresentationStaging.ts`'s own
   MOVE_STRENGTH substitute with the real MOVE_ENDEAVOR (id per
   `moves.json`), Grovyle-attacks-Onix, real turn-5 HPs (88 -> 1), reusing
   this scout's own module structure and the *already-generalized*
   `resolveRockSlidePresentationWindowContent` bridge unchanged (§9.2
   proved zero bridge edits needed for this attacker direction). Add
   `resolveTurn5EndeavorAttackLines`/`resolveTurn5EndeavorHpEndpoints`
   siblings to the existing `resolveTurn1RockSlideAttackLines`/
   `resolveTurn1RockSlideHpEndpoints` pattern (`turn1RockSlidePresentationStaging.ts:257-270`).
3. Wire `drawTurn5EndeavorText` (`battleScene.ts:6935-6949`) to source
   `onixHp`'s two endpoints from step 2's `hp-change{from,to}` instead of
   the direct `anchorPlayerAfterTurn3Hp`/`anchorPlayerAfterTurn5Hp` reads
   (`:6941`), and `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`'s text from
   step 2's resolved message (`:6948`) — `drawEndeavorSquish`'s own
   choreography (shake/hitsplat/droplets) stays byte-for-byte unchanged,
   same "gap 4 not on this window's critical path" reasoning §8.4's Option
   A already established (this window's own tick anchors are all
   presentation-native `pressTick`-relative offsets, no kernel timestamp
   needed).
4. Wire `drawTurn5RockSlideWindow`'s attack branch (`:11740-11743`) to the
   ALREADY-RESOLVED `TURN1_ROCKSLIDE_ATTACK_LINE1/2` constants (no new
   staging — §9.3's own finding that this content is byte-identical to
   window 2's) instead of the raw `ROCK_SLIDE_LINE1`/`ROCK_SLIDE_LINE2`
   literals.
5. Wire `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp(t, pressTick,
   anchorOpponentAfterTurn4Hp, anchorOpponentAfterTurn5Hp)` call (`:7483`,
   reached indirectly via `drawTurn6FieldBase`, §9.1's hidden-state finding)
   to `turn5FaintPresentationStaging.ts`'s own already-staged/tested KO
   `hp-change{to:0}` for its `to` endpoint — this is the SAME already-landed
   staging module the fainted-branch window (§7) consumes, just a second,
   earlier consumption point in this window's own timeline; the `from`
   endpoint (`anchorOpponentAfterTurn4Hp`) still has no staged proof and may
   need to stay a literal for this pass (name it as a residual gap in the
   wiring worker's own follow-up report if so — do not silently skip it).
6. Re-run `npm run compare -- turn5-rockslide.json` and confirm it still
   matches at **256/256** (recorded count, `docs/battle-turn-notes.md:5309`)
   before/after, PLUS a regression sweep of `turn1-rockslide.json` (256/256)
   and `turn5-faint.json` (110/110) — the two already-wired windows this
   step's own edits sit adjacent to (`drawTurn6FieldBase` is shared
   machinery reached by both this window and the fainted branch) — the
   checkpoint's own acceptance bar.

### 9.5 Comparator re-pin

Ran three times live this session, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn5-rockslide.json --summary   (run 1)
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary   (run 2, determinism check)
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-faint.json --summary
110/110 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest
```

`turn5-rockslide.json` matches its recorded count (`docs/battle-turn-
notes.md:5309`, 256/256) both runs — re-pinned live, this is the baseline
the wiring step (§9.4) must preserve. `turn5-faint.json`/`turn1-rockslide.json`
re-confirm their own already-wired counts unchanged, proving this session's
read-only recon (plus the new unwired `turn5EndeavorPresentationStaging.ts`
module) touched nothing live.
