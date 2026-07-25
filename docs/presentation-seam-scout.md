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
