# Presentation-seam checkpoint — scout (read-only recon)

Pre-banked evidence for ROADMAP "Executable-frontier reset" §3's mandatory
checkpoint (`ROADMAP.md:1204-1221`): after step (iv) lands, one already-exact
presentation window must be re-driven from kernel semantic events instead of
turn-N state, with its committed trace still passing at its recorded count.
This document is reconnaissance only — **no production code was changed**.

> **Oracle routing note (2026-07-27):** the historical `turn*-*.json` trace
> family predates the `oracleProfile` field, so `npm run compare` routes it
> to Battle Scene **ON** (8012) by AGENTS.md's documented legacy contract.
> Every acceptance count in this file is that ON-profile bar, intentionally
> — do not "fix" a trace by forcing 8014 (see PAPERCUTS.md).

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

> **STATUS UPDATE (2026-07-26, later same day): §9.4's own 6-rung wiring
> plan is DONE.** Rung 1 (the 3 opcodes, §9.2) landed in `PROGRESS-archive
> .md` entry 464 (`4758e8c`); rungs 2-6 (real `MOVE_ENDEAVOR` staging +
> `battleScene.ts` wiring) landed in entry 465, re-pinned live at
> `turn5-rockslide.json` 256/256, `turn1-rockslide.json` 256/256,
> `turn5-faint.json` 110/110 (plus a 14-trace sweep). The ONE item this
> section's own plan left open is the `anchorOpponentAfterTurn4Hp` `from`-
> endpoint residual gap entry 465 named explicitly (§9.4 step 5) — it needs
> a NEW turn-4 RockSlide-settle staging module before it can be wired for
> real, not a redo of this section's own plan. A later PROGRESS entry
> (468) correctly scoped this as "seam-scout §9 items **1/5**"; that `1/5`
> qualifier was dropped in later carried-forward summaries (484-486),
> which is what caused this exact already-done plan to be re-briefed to a
> worker on 2026-07-26 ~22:00 (re-verified still green, zero code changes,
> see that session's PROGRESS entry). Read this whole section for the
> ORIGINAL recon/design record; for current status, trust this note over
> the prose below.
>
> **STATUS UPDATE 2 (2026-07-26, later still): the last residual item is
> ALSO closed.** `turn4RockSlidePresentationStaging.ts` (new) stages the real
> turn-4 Onix ROCK_SLIDE -> Grovyle hit chain (41 -> 1), sourcing its own RNG
> seed from `battle1-grovyle-faint-ram-dump.json`'s already-committed/
> already-imported `rngLedger` (not a fresh probe) — independently
> corroborated by `battleScene.ts`'s own `drawTurn4KickoffText` doc comment,
> which separately cites the exact same 3 ticks for accuracy/crit/damage-lock.
> `battleScene.ts` wires `drawTurn4RockSlideAttack`/
> `drawTurn4RockSlideTurnEndSettledMenu`'s HP endpoints, `drawTurn4RockSlideWindow`'s
> attack text (now `TURN1_ROCKSLIDE_ATTACK_LINE1/2`, byte-identical content),
> `drawMenuIdleBaseWithOpponentHp`'s `turn4Resolved` arm, and — the residual
> gap itself — `drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp` `from`
> endpoint, all off this staged proof instead of the bare
> `anchorOpponentAfterTurn4Hp` literal. Re-pinned live: `turn4-rockslide.json`
> 250/250, regression sweep unchanged (`turn5-rockslide.json` 256/256,
> `turn1-rockslide.json` 256/256, `turn5-faint.json` 110/110,
> `turn4-doubleteam.json` 250/250, `turn4-menu.json` 44/44,
> `turn3-rockslide.json` 256/256). §9's own scope is now fully closed — no
> more residual items.

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

## 10. Prep-scout for the NEXT window, 2026-07-27 (`turn3-rockslide.json`)

Read-only recon plus one unwired staging module/test — same contract §8/§9
used, both of which landed on the wiring worker's first try. Since §9 was
written, **§9's entire wiring program landed, including its own named
residual** (§9's own STATUS UPDATE/STATUS UPDATE 2 notes): `battleScene.ts`
now also imports `turn4RockSlidePresentationStaging.ts` (real turn-4 Onix
ROCK_SLIDE -> Grovyle, 41 -> 1) and wires `drawTurn4RockSlideAttack`/
`...TurnEndSettledMenu`'s HP endpoints, `drawTurn4RockSlideWindow`'s attack
text, `drawMenuIdleBaseWithOpponentHp`'s `turn4Resolved` arm, and
`drawTurn5RockSlideAttack`'s own `rockSlideOpponentHp` `from` endpoint off
that staged proof. **Four windows are now fully wired**: `turn5-faint.json`
(§7), `turn1-rockslide.json` (§8), `turn5-rockslide.json` +
`turn4-rockslide.json` (§9). `battleScene.ts` grew from 17,888 lines (§9) to
**18,482**; `battleScriptEvents.ts`'s event union grew from 22 kinds (§9) to
**23** (`set-battler-item`, new since §9, emitted by
`battleScriptRemoveitemOpcode.ts:64` — `Cmd_removeitem`'s own item-consumption
notify, unrelated to this window's own content, noted for completeness only).

**One more finding worth flagging before the pick, not chased further this
session:** re-grepping every `kind: "<variant>"` site fresh (same discipline
§7.1/§7.2 established), `stat-stage-change` now HAS a real production
emission site — `battleScriptStatBuffs.ts:297` (`ChangeStatBuffs`'s shared
guard-ladder, consumed by both `battleScriptHitChainOpcode.ts` and
`battleScriptStatbuffchangeOpcode.ts`) — and the executable-frontier census
(`docs/executable-frontier-census.md:72`, regenerated 2026-07-27) now lists
`EFFECT_EVASION_UP` (DOUBLE_TEAM's own effect) as **executable**. §5/§7.2's
gap #3 ("`stat-stage-change` still never emitted") reads as closed for this
specific case pending its own live staged proof — nothing in this session
ran that proof (out of this window's own scope), so it is **not** claimed
closed here, only flagged: it plausibly narrows `turn4-doubleteam.json`'s own
STAT_ROSE-banner gap (named blocked in §8.3's own mapping-table row) for a
future prep-scout to verify, rather than re-assert unchanged.

### Candidates weighed (smallest input surface, not by interest)

Per this brief's own instruction, ranked by input surface at the leaf, not
interest — enumerated from `tools/compare/traces/` and `battleScene.ts`'s own
dispatchers:

| trace | frames | leaf function(s) | own new HP anchors needed | blocked on |
| --- | --- | --- | --- | --- |
| `turn3-rockslide.json` | 256 (`docs/battle-turn-notes.md:3606`) | `drawTurn3RockSlideAttack`/`...Window`/`...TurnEndSettledMenu`, `battleScene.ts:6686-6760` | ONE new staged hit chain (88->41) — everything else (choreography, message resolver) is already-proven reuse | **nothing** — MOVE_ROCK_SLIDE has been fully executable since §8; this is pure parameterization |
| `turn3-endeavor.json` | 192 (`docs/battle-turn-notes.md:3431`) | `drawTurn3EndeavorText`, `:6578-6599` | ONE new staged hit chain (101->88) — same reuse shape as the row above, off `turn5EndeavorPresentationStaging.ts`'s own now-real MOVE_ENDEAVOR pattern | **nothing new** — EFFECT_ENDEAVOR's 3 opcodes were registered and wired for turn 5 this same week (§9's own landed program); a genuinely comparable pick, see tiebreak below |
| `turn4-doubleteam.json` | 250 (`docs/battle-turn-notes.md:3919`) | `drawTurn4KickoffText` + `drawDoubleTeamClones`/`drawStatsBanner`, `:6827-6837` | kickoff message: zero new work (identical `STRINGID_USEDMOVE` mechanism); STAT_ROSE banner: unresolved pending the fresh `stat-stage-change` finding above | the evasion-rise banner specifically — real gap status now uncertain (see finding above), not re-verified this session — **not the cheapest known-clear pick today** |
| `turn5-sitrus-a/b/c/d.json` | 110/82/181/133 (`docs/battle-turn-notes.md:4795`,`:5136`) | `onixSitrusRotateMatrix`/`turn5SitrusRingMatrix`/`turn5SitrusOnixHp` family, `:7290-7622` | the Sitrus proc itself (item-triggered heal, a different subsystem: `heldItemHeal.ts`, not a move hit chain at all) | wide reuse blast radius — `turn5SitrusOnixHp`/`turn5SitrusResettledBounceTick` are called from turns 5 through 10+'s own dispatchers (`grep` hits at `:8424,8764,8790,9013,9026,9298,10033,10118,10621,10697,10805,10894,10975`); **not smallest by input surface**, rejected on that basis alone, same discipline §3's own note used to reject `turn1-kickoff.json` |
| `turn2-endeavor.json`/`turn2-dragonbreath.json` | 77/237 | `drawTurn2KickoffText`, `:6504+` | same ENDEAVOR reuse shape as `turn3-endeavor.json`'s own row (Onix 117->101) | **nothing new**, same family as turn3-endeavor — but turn 2 is EARLIER in the arc than turn 3, so picking it first leaves turn 3 still unconverted; no cheapness advantage over turn 3's own row |

**Pick: `turn3-rockslide.json`.** Tiebreak against its closest competitor
(`turn3-endeavor.json`, genuinely comparable — both need exactly one new
staged hit chain reusing an already-proven resolver, zero new kernel/bridge
work): `turn3-rockslide.json` **closes the entire Grovyle ROCK_SLIDE HP
chain**. Turns 1 (143->101), 4 (41->1), and 5's fatal hit (->0) already have
staged proof and are wired (§7/§8/§9); turn 3 (88->41) was the *only*
remaining unstaged link between turn 1's settle and turn 4's own pre-hit
read. Landing it means every ROCK_SLIDE hit in this fight's own HP timeline
has kernel-event proof, not three of four — a fully closed arc, which is a
stronger demonstration of ISSUES #39's window-by-window retirement path than
adding a third (of at least three: turns 2/3/5) Endeavor instance while
leaving earlier ones unconverted. It is also marginally the more
mechanically de-risked pick: its own dispatch gate is a strict subset of
`turn3-endeavor.json`'s own gate (reached via the identical
`turn2Resolved`/`turn3Resolved`/`turn4Resolved`/`sm.cursor` chain, plus one
additional in-function tick check, §10.1) with zero additional branch
complexity, and every one of its choreography helpers has now been reused
unchanged **three** times over (turns 1, 4, and this one) — the most
proven-by-repetition presentation code in the whole family.

### 10.1 Every input `turn3-rockslide.json` consumes today (re-verified against `HEAD`, commit `d78d370`)

**Dispatch-routing booleans/gates**, all in `drawFightSubmenuWindow`
(`battleScene.ts:5269-5449`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn8Resolved`…`turn5Resolved` | `:5342-5372` | all false (else routes to turns 6-9's own dedicated dispatchers) |
| `sm.openElapsed`/`sm.closeElapsed` | `:5374,5388` | both past their own DMA-wait windows (ordinary settled-submenu path) |
| `sm.confirmElapsed !== null` | `:5395` | true (turn 3's own real A-confirm press already landed, `TICK0 + sm.confirmElapsed` = `TURN3_CONFIRM_PRESS_TICK` = 3891) |
| `inTurn4DoubleTeamWindow = turn3Resolved && !turn4Resolved` | `:5406` | irrelevant once both are false (only distinguishes turn 4's own reopened window from this one) |
| `t >= textStart` | `:5407-5408` | true (message has started; `textStart` is `turn2KickoffTextStartTick(pressTick)` since `turn2Resolved` is true here) |
| `sm.cursor === 2` | `:5414` | false (cursor rests on ROCK_SLIDE, slot 0, not DRAGON_BREATH — else routes to `drawTurn2KickoffText`) |
| `turn4Resolved` | `:5418` | false (else routes to `drawTurn5EndeavorText`) |
| `turn3Resolved` | `:5426` | false (else routes to `drawTurn4KickoffText`) |
| `turn2Resolved` | `:5434` | **true** — this is the one boolean that actually selects `drawTurn3EndeavorText(fb, t, pressTick)` (`:5440`); every check above it is a false/pass-through gate |
| `t >= rockSlideTextStartTick(TURN3_ROCKSLIDE_PRESS_TICK)` | `:6586` | **true** — the one ADDITIONAL in-function check (inside `drawTurn3EndeavorText` itself, not a further outer dispatch boolean) that hands off from the ENDEAVOR-text phase into `drawTurn3RockSlideWindow(fb, t)` (`:6587`), this window's own captured range (ticks 4080-4880) |

Same class as every prior window's own finding: scheduler/PC state, no
battle-content mapping is plausible for any of these gates.

**The hidden-state finding this brief explicitly asked to flag:** the
ROCK_SLIDE window's own two-argument leaf signature
(`drawTurn3RockSlideWindow(fb, t)`, `:6746`) is reached only by walking
through `drawTurn3EndeavorText`'s own three-argument signature first — the
`pressTick` that `drawTurn3RockSlideAttack` needs for its bounce-overlay call
(`drawMenuIdleBounceOverlay(fb, turn3KickoffBounceTick(t,
TURN3_CONFIRM_PRESS_TICK))`, `:6700`) is **not** the same tick anchor as the
ROCK_SLIDE choreography's own `pressTick` local (`TURN3_ROCKSLIDE_PRESS_TICK`,
a synthetic anchor, `:6647,6687`) — two independent tick anchors are live in
the same function body, one real (`TURN3_CONFIRM_PRESS_TICK=3891`, `:6455`,
the player's actual A-press) and one synthetic (`TURN3_ROCKSLIDE_PRESS_TICK
=3687`, chosen so the reused `rockSlide*` formulas land on oracle-confirmed
ticks, per the code's own doc `:6601-6646`). Also, `drawMenuHealthboxPlayer
(fb, 0)` (`:6699`) draws Onix's own healthbox at a baseline/default state
that the CALLER (`drawTurn3RockSlideWindow`, `:6755`) immediately overlays
with the real `anchorPlayerAfterTurn3Hp` value — the same "overlay applied
once at the dispatcher level, not the leaf" shape `drawTurn2KickoffText`
already established (documented in the code's own comment, `:6673-6684`, so
not silently hidden, but still a defaulted/overwritten call-chain value
worth naming per this brief's own ask).

**RAM-dump / HP-constant reads** — re-verified against each constant's own
definition (`battleScene.ts:1309-1371`), same "evidence over inference"
discipline §7.1/§9.1 already established:

| constant | value | real source | line(s) |
| --- | --- | --- | --- |
| `anchorOpponentAfterTurn2Hp` | 88 | asset read: `battle1-turn2-ram-dump.json`'s `battlerSnapshots.after_turn2.battler1.hp` (Grovyle's post-DRAGON_BREATH settle, carries no chip damage into turn 3) | `:1327-1329` |
| `anchorOpponentAfterTurn3Hp` | 41 | asset read: `battle1-grovyle-faint-ram-dump.json`'s `battlerSnapshots["4892"].battler1.hp` (turn 3's end/turn 4's reopen boundary snapshot) | `:1356-1358` |
| `anchorPlayerAfterTurn3Hp` | 88 | asset read: same `"4892"` snapshot, `battler0.hp` (Onix's own post-turn-3-ENDEAVOR settle — steady display value for this window, not a drain endpoint here) | `:1343-1345` |

Both of this window's own drain endpoints (`anchorOpponentAfterTurn2Hp`/
`anchorOpponentAfterTurn3Hp`) are ALREADY asset-backed real values, unlike
§9.1's own turn-5 window (which found 3 of 4 HP constants were bare literals
with only an uncommitted-probe paper trail) — this window needed no fresh RAM
probing to establish provenance, only a staged kernel proof (§10.2).

**Hardcoded strings** — `battleMenu.ts`, drawn by `drawTurn3RockSlideWindow`'s
own attack branch (`battleScene.ts:6754-6759`):

| input | literal | line(s) |
| --- | --- | --- |
| `ROCK_SLIDE_LINE1`/`ROCK_SLIDE_LINE2` | "ONIX used" / "ROCK SLIDE!" | `battleMenu.ts:1611-1612` — **still the raw literal**, consumed directly at `battleScene.ts:6758`; unlike `turn1-rockslide.json`'s and `turn5-rockslide.json`'s own attack branches, this call site was NOT updated to the already-resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2` constants (`:11980`) when those windows were wired — this window's own message conversion is a pure swap, zero new staging |

**Tick anchors** (all `pressTick`-relative offsets): `TURN3_ROCKSLIDE_PRESS_TICK`
=3687 (synthetic, `battleScene.ts:6647`), `TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY`
=662 (`:6670`), `TURN3_ROCKSLIDE_MENU_REDRAW_DELAY`=669 (`:6671`),
`TURN3_CONFIRM_PRESS_TICK`=3891 (real press, `:6455`), plus the reused
`battleMenu.ts` family: `ROCK_SLIDE_TEXT_DELAY`=393 (`:1616`),
`ROCK_SLIDE_RAM_ANCHOR_DELAY`=428 (`:1640`), `ROCK_SLIDE_HP_DRAIN_START_DELAY`
=597 (`:2203`) — all `pressTick`-relative, all presentation-native, same "not
a kernel gap" finding §8.4's Option A already established for this entire
function family (re-confirmed here, not re-argued).

**Sprite/animation cues** (pure `(t, pressTick, ...)` functions,
`battleMenu.ts`, called from `drawTurn3RockSlideAttack`,
`battleScene.ts:6686-6706`, **reused with ZERO code changes from windows 2
and 3's own already-wired calls** — the code's own doc comment, `:6601-6646`,
verifies this via a dense oracle sweep, not by assumption): `rockSlideBg3Y`
(`:1674`), `rockSlideMonBlinkInvisible` (`:2109`), `rockSlideMonShakeY2`
(`:2082`), `rockSlideHealthboxWobbleY2` (`:2098`), `rockSlideOpponentHp`
(`:2205`), `rockSlideDrawOrder`/`rockSlideRockState` (`:2042`/`:1771`),
`turn3RockSlideResettledBounceTick` (turn-3-local, reuses the same formula
shape but its own redraw-delay constant, `battleScene.ts:6716-6718`).

### 10.2 Staged proof: what the kernel emits today for this window's own content

MOVE_ROCK_SLIDE has been fully executable since §8 (no missing opcodes) —
unlike turn 5's own Endeavor gap, this window needed no opcode-registration
research, only a real hit chain at this window's own real HP endpoints.
`src/engine/turn3RockSlidePresentationStaging.ts` (new, **unwired** — not
imported by `battleScene.ts` or any production file) mirrors
`turn4RockSlidePresentationStaging.ts`'s pattern verbatim: real Onix/Grovyle
level-50 stats (`tests/damageCalc.test.ts`'s own `ONIX`/`GROVYLE` blocks,
same copies every sibling module uses), real MOVE_ROCK_SLIDE (id 157), Onix
attacking Grovyle at this window's own real pre-hit HP (88,
`anchorOpponentAfterTurn2Hp`).

**The RNG seed is turn 3's own real recorded value, identified (not
guessed) from `battle1-grovyle-faint-ram-dump.json`'s own already-committed
`rngLedger`** (24 entries, read fresh this session) — the same asset
`turn4RockSlidePresentationStaging.ts` already imports for turn 4's own seed.
Turn 4's own 4-roll group is ledger-documented at ticks 5316/5340/5343/5569
(`turn4RockSlidePresentationStaging.ts`'s own module doc). Working backward,
the ledger's own preceding 4-roll group — ticks 4078/4102/4105/4338
(`fromValue`s 3156327951/820043478/52983185/1798479152, spacing +24/+3/+233,
the SAME accuracycheck/critcalc/adjustnormaldamage/seteffectwithchance shape
turns 1 and 4's own modules already establish) — is this window's own
candidate seed group, immediately preceded by a distinct 2-roll group at
ticks 3929/4064 consistent with turn 3's own preceding ENDEAVOR half
(`turn3-endeavor.json`; `EFFECT_ENDEAVOR`'s own script has no
critcalc/adjustnormaldamage call, matching a 2-vs-4 roll split against
ROCK_SLIDE's own 4). **Verified live this session, not guessed**: staging
seed 3156327951 from `BattleScript_HitFromAtkCanceler` with Grovyle at 88 HP
produces exactly this result (`tests/turn3RockSlidePresentationStaging.test.ts`,
7 passing assertions, run this session):

```
targetHpAfter: 41   (88 -> 41, byte-identical to battleScene.ts's own
                      anchorOpponentAfterTurn2Hp/anchorOpponentAfterTurn3Hp
                      pair -- the real recorded turn-3 settle, not a
                      different-but-real roll)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE", substitutions:[]}
  set-battler-pp-data           {battler:0, movePosition:0, pp:9}
  animation                     {animationId:"MOVE_ANIMATION", battler:0, arguments:[...]}
  play-se                       (neutral-effectiveness hit sound)
  animation                     {animationId:"HIT_ANIMATION", battler:1, arguments:[]}
  health-bar-update             {battler:1, healthValue:47}
  hp-change                     {battler:1, from:88, to:41}
  set-battler-sprite-visibility {battler:0, invisible:false}   (moveend pass-through)
  set-battler-sprite-visibility {battler:1, invisible:false}   (moveend pass-through)
```

`health-bar-update`'s `healthValue` (47) is the damage DELTA (`from - to`,
88-41), not the settled end HP — same field-semantics finding §8.2 already
pinned, re-confirmed here by a dedicated test assertion, not re-derived from
scratch. `presentationEventWindowBridge.ts`'s existing
`resolveRockSlidePresentationWindowContent` resolves this run's own
message+hp-change pair **unchanged, zero bridge edits needed** — the same
"generalizes with zero edits" finding every sibling module in this family
has now independently confirmed three times over (turn 1, turn 4, this one).

**What this staged run does and does not prove:** it proves the real
ROCK_SLIDE hit-chain mechanism reproduces turn 3's own specific recorded
roll (88->41, not merely "a real roll") — the RNG-seed identification is
this module's own genuinely new work; the `message`/`hp-change`/bridge
mechanism itself was already proven twice over by its own siblings and is
not re-derived here, only re-exercised.

**Mapping table** (turn-N input -> kernel event / gap), current as of this
staged run:

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn8Resolved`…`turn2Resolved`/`sm.cursor`/`rockSlideTextStartTick` handoff dispatch chain (§10.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found; the already-generalized `sourceLabel`-keyed bridge needs no new design, only a new call site, same finding §9.3 already made |
| `anchorOpponentAfterTurn2Hp` (88) | `hp-change`'s `from` | **emitted today, proven this session**: staged run's own event has `from: 88` |
| `anchorOpponentAfterTurn3Hp` (41) | `hp-change`'s `to` | **emitted today, proven this session**: staged run's own event has `to: 41`, the real recorded settle, not merely a different-but-real roll |
| `rockSlideOpponentHp(t, pressTick, anchorOpponentAfterTurn2Hp, anchorOpponentAfterTurn3Hp)` interpolation | `hp-change{from,to}` as the two endpoints, `TURN3_ROCKSLIDE_PRESS_TICK` unchanged as the timing anchor | **fully unblocked**, no gap-4 kernel growth needed (same "presentation-native, no kernel dependency" finding §8.4's Option A already established for this whole function family) |
| `ROCK_SLIDE_LINE1`/`LINE2` ("ONIX used\nROCK SLIDE!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, already resolved** — byte-identical to `turn1RockSlidePresentationStaging.ts`'s own `TURN1_ROCKSLIDE_ATTACK_LINE1/2` (`battleScene.ts:11980`); this window's own call site (`:6758`) is the ONE remaining raw-literal consumer of this exact text among the four ROCK_SLIDE windows — zero new resolver work, only a new call site |
| `anchorPlayerAfterTurn3Hp` (88, Onix's own steady overlay, `:6733,6755`) | not an `hp-change` endpoint in THIS window's own chain (Onix isn't attacked by this hit — it's the attacker) | **no kernel event needed for this specific read**, same "steady-state read, not a drain endpoint" finding §9.3 already made for the mirror-image case (Grovyle's own steady HP during turn 5's Endeavor) |
| `TURN3_CONFIRM_PRESS_TICK`/`turn3KickoffBounceTick` (bounce-overlay tick, `:6455,6700`) | n/a — presentation-only bounce-phase timing, not battle content | not applicable, same class as every prior window's own non-content tick anchors |
| choreography (`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideMonBlinkInvisible`/`rockSlideHealthboxWobbleY2`/`rockSlideMonShakeY2`) | `animation{animationId:"MOVE_ANIMATION"/"HIT_ANIMATION"}` | **kind emitted today, proven** (this run's own `animation` events) — gap 6 (no frame-by-frame payload) unchanged, same as every prior window; the helpers themselves need zero code changes regardless |
| effectiveness SFX | `play-se` | **emitted today, proven**. Still moot for this checkpoint's own oracle (pixel-only, gap 8, unchanged) |

### 10.3 Ordered wiring plan (acceptance: `turn3-rockslide.json` still passes at 256/256, regression sweep over the adjacent ROCK_SLIDE/ENDEAVOR traces unchanged)

1. Wire `drawTurn3RockSlideAttack`/`drawTurn3RockSlideTurnEndSettledMenu`
   (`battleScene.ts:6686-6706`/`:6729-6734`) to source `rockSlideOpponentHp`'s
   and `opponentHealthboxContentForHp`'s HP arguments from
   `turn3RockSlidePresentationStaging.ts`'s `resolveTurn3RockSlideHpEndpoints()`
   `{from, to}` instead of the direct `anchorOpponentAfterTurn2Hp`/
   `anchorOpponentAfterTurn3Hp` reads (`:6695`, `:6732`) — every `rockSlide*`
   choreography helper stays byte-for-byte unchanged (§10.2's own finding:
   this whole function family needs no kernel-timestamp input, Option A from
   §8.4 applies unchanged a third time).
2. Wire `drawTurn3RockSlideWindow`'s attack branch (`:6758`) to the
   ALREADY-RESOLVED `TURN1_ROCKSLIDE_ATTACK_LINE1/2` constants
   (`battleScene.ts:11980`, zero new staging — §10.2's own finding that this
   text is byte-identical to window 2's) instead of the raw `ROCK_SLIDE_LINE1`/
   `ROCK_SLIDE_LINE2` literals — the fourth and final ROCK_SLIDE call site to
   make this swap (turns 1 and 5 already made it; turn 4 never needed to,
   since it never held the raw literals to begin with, per
   `turn4RockSlidePresentationStaging.ts`'s own doc).
3. `anchorPlayerAfterTurn3Hp`'s own steady overlay (`:6733,6755`, Onix's HP
   during this window) stays a direct literal for this pass — not a drain
   endpoint of THIS window's own hit chain (§10.2's own mapping-table row),
   same "narrow to what's actually unblocked" discipline every prior
   window's own plan used for its adjacent out-of-scope reads.
4. Re-run `npm run compare -- turn3-rockslide.json` and confirm it still
   matches at **256/256** (recorded count, `docs/battle-turn-notes.md:3606`)
   before/after, PLUS a regression sweep of `turn3-endeavor.json` (192/192,
   the immediately preceding phase in the SAME `drawTurn3EndeavorText`
   function this window's own edits sit inside), `turn1-rockslide.json`
   (256/256), `turn4-rockslide.json` (250/250), `turn5-rockslide.json`
   (256/256), and `turn5-faint.json` (110/110) — the checkpoint's own
   acceptance bar, matching the exact live counts §10.4 already re-pinned
   this session.

### 10.4 Comparator re-pin

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn3-rockslide.json --summary   (run 1)
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-rockslide.json --summary   (run 2, determinism check)
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-endeavor.json --summary
192/192 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-rockslide.json --summary
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-faint.json --summary
110/110 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-doubleteam.json --summary
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-menu.json --summary
44/44 frames matched -> tools/compare/out/latest
```

`turn3-rockslide.json` matches its recorded count (`docs/battle-turn-
notes.md:3606`, 256/256) both runs — re-pinned live, this is the baseline
the wiring step (§10.3) must preserve. Every adjacent trace re-confirms its
own already-established count unchanged, proving this session's read-only
recon (plus the new unwired `turn3RockSlidePresentationStaging.ts` module)
touched nothing live. `npm test` (233 files, 3289 tests) and `npm run build`
both green in this worktree at the same commit.

## 11. Prep-scout for the NEXT window, 2026-07-27 (`turn4-doubleteam.json`), side lane

Read-only recon plus one unwired staging module/test — same contract §8/§9/§10
used — for the window the supervisor assigned directly (not self-picked by
this scout, unlike §10): `turn4-doubleteam.json` (250 frames,
`docs/battle-turn-notes.md:3919`), Grovyle's own turn-4 DOUBLE_TEAM kickoff.
Run concurrently with a MAIN-lane worker wiring §10's own turn3-rockslide
plan in a sibling worktree — this session touches no `battleScene.ts` or
other production file, per this checkpoint's own read-only-recon-plus-one-
staging-module contract. All line numbers below are re-verified against this
worktree's own `HEAD` (`6ca54da`, unchanged from §10's own commit —
`battleScene.ts` has not grown since §10 was written in this lane, since the
concurrent turn3-rockslide wiring lands in a different worktree, not this
one).

**Correction to the brief's own framing, found by reading the actual leaf
function before staging anything (evidence over inference, same discipline
every prior section established):** the brief's own "WHY THIS WINDOW" note
says landing `stat-stage-change`'s new production emission site "plausibly
narrows this window's own STAT_ROSE gap," pointing at §8.3's own named gap
("`STAT_ROSE_LINE1`/`LINE2` … still a named gap"). That gap is real but
belongs to a **different window**: `STAT_ROSE_LINE1`/`LINE2` (the literal
text "Foe GROVYLE's evasiveness rose!", `battleMenu.ts:1592-1593`) is drawn
by `drawRockSlideWindow`'s own three-box text cycle (§8.1, turn 1's window),
not by this window's own leaf, `drawTurn4KickoffText`
(`battleScene.ts:6827-6837`) — that function draws exactly one text box
(`TURN_KICKOFF_LINE1`/`LINE2`, "Foe GROVYLE used\nDOUBLE TEAM!",
`battleMenu.ts:1086,1088`) and then, past `STATS_BANNER_END_DELAY`(274)
ticks, hands off straight to `drawTurn4RockSlideWindow` (`:6829`) — it never
reaches a STAT_ROSE text phase at all. `turn4-doubleteam.json`'s own 250
`captureFrames` (ticks 4934-5313) confirm this isn't just a static-analysis
argument: `TURN4_CONFIRM_PRESS_TICK`(4925)+274=5199 falls inside the capture
window, so the trace genuinely straddles both `drawTurn4KickoffText`'s own
kickoff phase (4934-5199) **and** the start of `drawTurn4RockSlideWindow`'s
own ROCK_SLIDE phase (5199-5313) — the latter is **already wired** (§9,
`turn4RockSlidePresentationStaging.ts`, imported at
`battleScene.ts:597`). So the genuinely unwired residual this window's own
250 frames still depend on is narrower than "the STAT_ROSE gap": it's
`drawTurn4KickoffText`'s own kickoff-phase content — the `TURN_KICKOFF_LINE1/2`
text, `drawDoubleTeamClones`'s clone choreography, and `drawStatsBanner`'s
evasion-rise BG1 graphic — plus the two steady (non-draining) HP overlays it
threads through `drawActionMenuIdleContent`. The brief's own underlying
instinct (that DOUBLE_TEAM's own now-executable `stat-stage-change` route is
relevant here) is correct, just not via the STAT_ROSE-text gap specifically —
see §11.2's own mapping table for the real, verified connection.

### 11.1 Every input `turn4-doubleteam.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing booleans/gates**, all in `drawFightSubmenuWindow`
(`battleScene.ts:5269-5457`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn9Resolved`…`turn5Resolved` | `:5333-5372` | all false (else routes to turns 6-11's own dedicated dispatchers) |
| `sm.openElapsed`/`sm.closeElapsed` | `:5374,5388` | both past their own DMA-wait windows (ordinary settled-submenu path) |
| `sm.confirmElapsed !== null` | `:5395` | true (turn 4's own real A-confirm press already landed, `TICK0 + sm.confirmElapsed` = `TURN4_CONFIRM_PRESS_TICK` = 4925, a REAL press — unlike turn 3's own synthetic ROCK_SLIDE anchor, §10.1) |
| `inTurn4DoubleTeamWindow = turn3Resolved && !turn4Resolved` | `:5406` | **true** — this is the one boolean that actually selects this window (distinguishes it from turn 1's own cursor-0 confirm, which shares the same `turnKickoffTextStartTick` formula family) |
| `t >= textStart` | `:5407-5408` | true (message has started; `textStart` is `turnKickoffTextStartTick(pressTick)` since `inTurn4DoubleTeamWindow` routes past the `turn2KickoffTextStartTick` branch) |
| `sm.cursor === 2` | `:5414` | false (cursor rests on ROCK_SLIDE, slot 0, not DRAGON_BREATH — else routes to `drawTurn2KickoffText`) |
| `turn4Resolved` | `:5418` | false (else routes to `drawTurn5EndeavorText`) |
| `turn3Resolved` | `:5426` | **true** — the one boolean that actually selects `drawTurn4KickoffText(fb, t, pressTick)` (`:5431`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class as every prior window's own dispatch chain |

**RAM-dump / HP-constant reads** — re-verified against each constant's own
definition (`battleScene.ts:1309-1371`), same discipline §7.1/§9.1/§10.1
already established:

| constant | value | real source | line(s) | role in THIS window |
| --- | --- | --- | --- | --- |
| `anchorOpponentAfterTurn3Hp` | 41 | asset read: `battle1-grovyle-faint-ram-dump.json`'s `battlerSnapshots["4892"].battler1.hp` | `:1356-1358` | Grovyle's own steady overlay HP (`drawMenuIdleBaseWithOpponentHp`'s `turn3Resolved` arm, `:5166`) — **not a drain endpoint of this window's own content**: DOUBLE_TEAM is non-damaging, so this value never changes across the whole 250-frame span |
| `anchorPlayerAfterTurn3Hp` | 88 | asset read: same `"4892"` snapshot, `battler0.hp` | `:1343-1345` | Onix's own steady overlay HP, threaded through `drawTurn4KickoffText`'s own `drawActionMenuIdleContent(fb, bounceTick, true, true, anchorPlayerAfterTurn3Hp, true)` call (`:6833`) — same "steady read, not a drain endpoint" class §10.2's own mapping-table row already established for the mirror-image Onix case |

Both are already asset-backed (not bare literals) and already staged as
`hp-change` endpoints by `turn4RockSlidePresentationStaging.ts` for the
LATER, already-wired ROCK_SLIDE half of this same window's own capture
range — this window's own kickoff phase only ever reads them as static
overlay content, never as a transition.

**Hardcoded strings** — `battleMenu.ts`, drawn by `drawTurn4KickoffText`
itself (`battleScene.ts:6835`):

| input | literal | line(s) |
| --- | --- | --- |
| `TURN_KICKOFF_LINE1`/`LINE2` | "Foe GROVYLE used" / "DOUBLE TEAM!" | `battleMenu.ts:1086,1088` — the SAME literal turn 1's own kickoff text uses (`turn1RockSlidePresentationStaging.ts`'s own `resolveTurn1DoubleTeamKickoffLines`, which asserts the mechanism by analogy only); this session's own staged run (§11.2) re-derives it from a REAL run of THIS specific turn's own script, a strictly stronger proof |

**Tick anchors** (all `pressTick`-relative offsets, `TURN4_CONFIRM_PRESS_TICK`
=4925 the shared real-press anchor, `battleScene.ts:6772`):
`STATS_BANNER_END_DELAY`=274 (`battleMenu.ts:1254`), plus the reused
`turnKickoffTextVisibleChars`/`turnKickoffBounceTick`/`TURN4_KICKOFF_FROZEN_
BOUNCE_TICK` family (`:6795-6798,6793`) — all presentation-native, same "not
a kernel gap" finding §8.4's Option A already established for this whole
function family, re-confirmed here a fourth time.

**Sprite/animation cues** (pure `(t, pressTick, ...)` functions, called from
`drawTurn4KickoffText`, `battleScene.ts:6827-6837`, reused with **zero code
changes** from turn 1's own already-written (but, per `docs/battle-turn-
notes.md` §22, never pixel-verified until a later session closed it)
functions of the same name): `doubleTeamCloneOffsets`/`getDoubleTeamClonePalette`/
`eraseGrovyleFootprint` (`battleMenu.ts:1220`/`battleScene.ts:4264,4328`,
`drawDoubleTeamClones`), `statsBannerEva`/`statsBannerBg1Y`
(`battleMenu.ts:1273,1318`, `drawStatsBanner`).

**The hidden-state finding this brief explicitly asked to flag:** Grovyle's
own EVASION stat stage is never read from anywhere in `battleScene.ts` at
all for this window — `drawStatsBanner`'s own `eva`/`evb` locals (`:4519,4539`)
are GBA alpha-BLEND coefficients (`BLDALPHA` register halves), not the
battle stat stage; the function draws the SAME hardcoded evasion-increase
graphic (`gStatAnim_Increase_Tilemap`/`gStatAnim_Evasion_Pal`) regardless of
what Grovyle's real stage is or was, because this slice only ever wires up
the one stat/direction DOUBLE_TEAM needs (the code's own doc comment,
`:4498-4500`). This is a genuinely defaulted/never-threaded value, worth
naming per this brief's own ask: **the real battle-content fact this window
renders — Grovyle's evasion rising a SECOND time, 7 -> 8, not a fresh 6 -> 7
— exists nowhere in `battleScene.ts`'s own state.** §11.2 stages it for the
first time.

### 11.2 Staged proof: what the kernel emits today for this window's own content

EFFECT_EVASION_UP has been executable since before this session
(`docs/executable-frontier-census.md:72`, `BattleScript_EffectEvasionUp`) —
and unlike every ROCK_SLIDE/ENDEAVOR sibling module, this move's own real
script needs **no RNG research** at all: DOUBLE_TEAM draws zero `Random()`
calls (RAM-confirmed, `docs/battle-turn-notes.md:93`,`:1339`).
`src/engine/turn4DoubleTeamPresentationStaging.ts` (new, **unwired** — not
imported by `battleScene.ts` or any production file) stages Grovyle's own
real turn-4 DOUBLE_TEAM use: real level-50 stats
(`tests/damageCalc.test.ts`'s own `GROVYLE` block, same copy every sibling
module uses), real MOVE_DOUBLE_TEAM (id 104), self-targeted
(attacker===target===effectBattler), real pre-move HP (41,
`anchorOpponentAfterTurn3Hp`), and — the one genuinely new input this module
introduces — a real pre-move EVASION stat stage of **7, not the neutral
default 6** (turn 1's own persisted boost, `docs/battle-turn-notes.md:1132`,
`:3845`'s own RAM probe: "evasion stage 7->8 at 4965, RAM-exact").

**One real dead end, corrected in the code and documented so the next
session doesn't repeat it:** this module's first draft entered at
`BattleScript_HitFromAtkCanceler`, mechanically copying every ROCK_SLIDE
sibling's own entry label. That is the WRONG label for this move family —
`BattleScript_HitFromAtkCanceler` unconditionally runs `accuracycheck
ACC_CURR_MOVE` (`reference/pokeemerald/data/battle_scripts_1.s:244`), and
DOUBLE_TEAM's own `moves.json` `accuracy` field is 0, which this engine's
faithfully-ported `Cmd_accuracycheck` (`battleScriptHitChainOpcode.ts:877`,
`calculateAccuracy`'s own `moveAccuracy` input)
turns into `calc=0` — an unconditional miss, consuming 1 RNG call and
producing no `stat-stage-change` at all. Verified live, not guessed: running
it that way first produced exactly that failure (1 RNG call, evasion stage
unchanged at 7, no `STRINGID_DEFENDERSSTATROSE`). The real script
(`reference/pokeemerald/data/battle_scripts_1.s:487-494`,
`BattleScript_EffectEvasionUp` -> shared `BattleScript_EffectStatUp`/
`...StatUpAfterAtkCanceler`) never runs `accuracycheck` at all — it goes
`setstatchanger` -> `attackcanceler` -> `attackstring` -> `ppreduce` ->
`statbuffchange` -> ... directly, matching
`tests/battleScriptStatbuffchangeOpcode.test.ts`'s own "Double Team" case,
which already enters at this same correct label (that test just doesn't run
it with turn 4's own real pre-move stage/RNG/full event capture — this
module does). Fixed to enter at `BattleScript_EffectEvasionUp`; the RNG seed
(3051035979) is turn 4's own real recorded value —
`turn4RockSlidePresentationStaging.ts:88`'s own `STAGED_RNG_SEED`, reusable
here because DOUBLE_TEAM (Grovyle's move, resolving before Onix's ROCK_SLIDE
within the same turn) draws zero RNG, so the value live entering DOUBLE_TEAM's
own script equals the value live entering ROCK_SLIDE's — verified live this
session (`tests/turn4DoubleTeamPresentationStaging.test.ts`, 5 passing
assertions): `rngCalls: 0`, ending `rngValue` byte-identical to the seed.

```
evasionStageAfter: 8   (7 -> 8, byte-identical to the real RAM-confirmed
                         turn-4 SECOND rise, docs/battle-turn-notes.md:3845 --
                         not a fresh 6 -> 7 first use)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE"}                    sourceLabel: BattleScript_EffectStatUpAfterAtkCanceler
  set-battler-pp-data           {battler:1, movePosition:0, pp:13}                  (14 -> 13; 14 itself is this module's own ASSUMPTION -- base 15 minus turn 1's one use -- not independently RAM-verified this session, flagged not guessed-silently)
  stat-stage-change             {battler:1, stat:"evasion", from:7, to:8}           sourceLabel: BattleScript_EffectStatUpAfterAtkCanceler
  animation                     {animationId:"MOVE_ANIMATION", battler:1, arguments:["104","0","0","0","0","0"]}
  animation                     {animationId:"STATS_CHANGE", battler:1, arguments:["21"]}
  message                       {messageId:"STRINGID_DEFENDERSSTATROSE"}           (NOT STRINGID_ATTACKERSSTATROSE -- target===attacker picks the "defender's own" string variant, battleScriptStatBuffs.ts:276)
  set-battler-sprite-visibility {battler:1, invisible:false}                       (moveend pass-through)
```

No `hp-change`/`health-bar-update`/`play-se` anywhere in this stream — this
window's own kickoff content genuinely has no damage component, confirmed by
a dedicated test assertion, not inferred from the move's data row alone.
The `STATS_CHANGE` animation kind is new to this section's own event
inventory (every ROCK_SLIDE/ENDEAVOR sibling only ever emits `MOVE_ANIMATION`/
`HIT_ANIMATION`) — its own emission site is
`battleScriptStatbuffchangeOpcode.ts:190` (`B_ANIM_STATS_CHANGE` ->
`animationId:"STATS_CHANGE"`, `readsAnimArg1:true`), and its argument (21) is
independently decodable: `Cmd_setgraphicalstatchangevalues`'s own formula
(`:124,143`) gives `STAT_ANIM_PLUS1(14)+1 + STAT_EVASION(7) - 1 = 21` for a
+1 evasion rise — the SAME formula shape (and the SAME opcode/handler) the
existing "Swords Dance" test already pins for a +2 attack rise
(`tests/battleScriptStatbuffchangeOpcode.test.ts:165-167`, `animArg1===39`).
This means the kernel's own `STATS_CHANGE` animation event carries enough
payload to distinguish "which stat, which direction, which magnitude" in
principle — not merely "an animation happened" — though this window's own
`drawStatsBanner` never needs to consume that distinction today (it already
hardcodes the one evasion-increase graphic this slice wires up, §11.1).

**Mapping table** (turn-N input -> kernel event / gap), current as of this
staged run:

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn9Resolved`…`turn3Resolved`/`sm.cursor`/`inTurn4DoubleTeamWindow` dispatch chain (§11.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found |
| `TURN_KICKOFF_LINE1`/`LINE2` ("Foe GROVYLE used\nDOUBLE TEAM!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, re-derived from a real run of THIS turn's own script** (not merely asserted by analogy to turn 1's, unlike `turn1RockSlidePresentationStaging.ts`'s own `resolveTurn1DoubleTeamKickoffLines`) — `resolveTurn4DoubleTeamKickoffLines` (this module) resolves to `["Foe GROVYLE used", "DOUBLE TEAM!"]`, byte-identical |
| (the never-rendered) `STAT_ROSE_LINE1`/`LINE2` gap named in §8.3/§5/§7.2 | `message{messageId:"STRINGID_DEFENDERSSTATROSE"}` | **NOT this window's own gap to close** (§11's own preamble correction) — but note for whichever window DOES render that text (turn 1's own `drawRockSlideWindow`): this staged run proves the real message is `STRINGID_DEFENDERSSTATROSE` (matching `tests/battleScriptStatbuffchangeOpcode.test.ts`'s own finding for the identical self-target shape), not a still-unproven guess |
| Grovyle's own EVASION stat stage, 7 -> 8 (never read anywhere in `battleScene.ts` today, §11.1's own hidden-state finding) | `stat-stage-change{battler:1, stat:"evasion", from:7, to:8}` | **emitted today, proven this session** — the real production emission site (`battleScriptStatBuffs.ts:296-303`) is reachable end-to-end from this move's own real script entry with turn 4's own real pre-move stage and RNG, not merely reachable in isolation (`battleScriptStatbuffchangeOpcode.test.ts`'s own "Double Team" case already proved isolated reachability with an arbitrary seed and the neutral 6->7 first-use stage; this module is the first to prove the SECOND-use 7->8 transition with the real recorded seed) |
| `doubleTeamCloneOffsets`/clone choreography (`drawDoubleTeamClones`) | `animation{animationId:"MOVE_ANIMATION"}` | **kind emitted today, proven** — this run's own payload is `arguments:["104","0","0","0","0","0"]` (move id, real values). Gap 6 (no frame-by-frame payload) unchanged, same as every prior window; the clone helper itself needs zero code changes regardless |
| `statsBannerEva`/`statsBannerBg1Y` (`drawStatsBanner`'s own evasion-increase BG1 graphic) | `animation{animationId:"STATS_CHANGE", arguments:["21"]}` | **kind AND a decodable stat/direction/magnitude payload emitted today, proven** — genuinely new finding this section establishes (no prior window's own staged run ever exercised `Cmd_playanimation`'s `B_ANIM_STATS_CHANGE` arm). Not currently a REQUIRED gate for this window (only one graphic is wired, §11.1), but a real, present signal a bridge COULD key a dispatch decision off, unlike the purely-scheduler gates above |
| `anchorOpponentAfterTurn3Hp`(41)/`anchorPlayerAfterTurn3Hp`(88) steady overlays | not `hp-change` endpoints in THIS window's own chain (no battler is drained by a self-target status move) | **no kernel event needed for either read**, same "steady-state read, not a drain endpoint" finding §9.3/§10.2 already made for their own mirror-image cases |
| PP readout (10th slot after turn 1, 14->13 assumed) | `set-battler-pp-data{battler:1, movePosition:0, pp:13}` | **emitted today, proven this run** — but the STARTING pp (14) is this module's own unverified assumption (base 15 minus turn 1's one use), not independently RAM-confirmed this session; flagged, not silently trusted, same "evidence over inference" discipline as every other named input |

**What this staged run does and does not prove:** it proves the real
DOUBLE_TEAM self-target chain reproduces turn 4's own specific real
transition (evasion 7->8, not merely "a real rise") and that the resulting
`stat-stage-change`/`STATS_CHANGE`-animation/`STRINGID_DEFENDERSSTATROSE`
triad is genuinely reachable end-to-end through the real script, not just in
an isolated opcode test — that reachability is this module's own new work.
It does NOT prove `resolveRockSlidePresentationWindowContent`
(`presentationEventWindowBridge.ts`) generalizes here: it does not. That
bridge REQUIRES an `hp-change` event with a matching `sourceLabel`
(`resolveRockSlidePresentationWindowContent`'s own code,
`presentationEventWindowBridge.ts:95-98`), and this window's own real event
stream never contains one — a fundamentally different shape than every
ROCK_SLIDE/ENDEAVOR sibling's own window, not just a different label to pass
as this function's own override parameter. A genuinely NEW bridge shape is
needed (§11.3 step 2), not a relabeled reuse — this prep-scout does not add
it (`presentationEventWindowBridge.ts` is a shared production file, out of
this checkpoint's own one-staging-module contract), only names it precisely
enough for the wiring worker to add it directly.

### 11.3 Ordered wiring plan (acceptance: `turn4-doubleteam.json` still passes at 250/250, regression sweep over the adjacent DOUBLE_TEAM/ROCK_SLIDE traces unchanged)

1. Add a `resolveDoubleTeamKickoffPresentationWindowContent`-shaped sibling
   to `presentationEventWindowBridge.ts` (same null-safe pattern as
   `resolveFaintPresentationWindowContent`/`resolveRockSlidePresentationWindowContent`,
   but a NEW return shape — `{message, statChange}`, no `hp` field at all,
   since this window's own content genuinely has none, §11.2's own finding):
   keyed on `provenance.sourceLabel === "BattleScript_EffectStatUpAfterAtkCanceler"`
   for both the `message{messageId:"STRINGID_USEDMOVE"}` event (this window's
   own kickoff text) and the `stat-stage-change` event (the evasion-rise
   content) — both are real, present, and co-located under this one label per
   §11.2's own event dump, so a single `sourceLabel` check identifies this
   window's own content the same "identify from provenance, never a turn
   number" way every prior bridge function does.
2. Wire `drawTurn4KickoffText` (`battleScene.ts:6827-6837`) to source
   `TURN_KICKOFF_LINE1/2`'s text from step 1's resolved message (mechanically
   identical `STRINGID_USEDMOVE` mapping, zero new resolver work beyond a
   `B_ATK_NAME_WITH_PREFIX`/`B_BUFF2` pair the turn-1 window's own gap-5
   resolver already supplies, §8.5 step 1) — `drawDoubleTeamClones`/
   `drawStatsBanner`'s own choreography stays byte-for-byte unchanged (no
   kernel-timestamp input needed, §8.4 Option A applies unchanged a fourth
   time); their FIRING (not their internal `pressTick`-relative math) may
   additionally be gated on step 1's `statChange` signal being present, since
   that's now a real, provable "did DOUBLE_TEAM's own effect actually run"
   check instead of pure dispatch-boolean plumbing — genuinely optional for
   250/250 (the dispatch booleans alone already reproduce the pixels
   correctly), named here as a real option, not a requirement.
3. The two steady HP overlays (`anchorOpponentAfterTurn3Hp`/
   `anchorPlayerAfterTurn3Hp`, §11.1/§11.2's own mapping-table rows) stay
   direct literals for this pass — not drain endpoints of THIS window's own
   content, same "narrow to what's actually unblocked" discipline every
   prior window's own plan used for its adjacent out-of-scope reads.
4. `set-battler-pp-data`'s own starting-PP assumption (14, §11.2) needs a
   real RAM check before it's trusted for a PP-readout wiring step (out of
   THIS window's own pixel content regardless, since `drawTurn4KickoffText`
   never renders the FIGHT submenu's PP digits itself) — named as a residual
   for whichever later window converts the submenu's own PP display, not
   blocking this one.
5. Re-run `npm run compare -- turn4-doubleteam.json` and confirm it still
   matches at **250/250** (recorded count, `docs/battle-turn-notes.md:3919`,
   re-pinned live in §11.4) before/after, PLUS a regression sweep of
   `turn4-rockslide.json` (250/250, the ALREADY-WIRED tail half of this exact
   same trace's own capture range — the step most likely to regress if the
   new bridge function's `sourceLabel` key is too broad), `turn1-rockslide.json`
   (256/256, shares `TURN_KICKOFF_LINE1/2`'s own text mechanism),
   `turn3-rockslide.json`/`turn3-endeavor.json` (whatever this worktree's own
   `HEAD` currently pins them at — the concurrent MAIN-lane wiring step may
   land mid-session in a sibling worktree, not this one), and `turn5-rockslide.json`/
   `turn5-faint.json` (256/256, 110/110) — the checkpoint's own established
   acceptance bar.

### 11.4 Comparator re-pin

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn4-doubleteam.json --summary   (run 1)
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-doubleteam.json --summary   (run 2, determinism check)
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-rockslide.json --summary
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-endeavor.json --summary
192/192 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-faint.json --summary
110/110 frames matched -> tools/compare/out/latest
```

`turn4-doubleteam.json` matches its recorded count (`docs/battle-turn-
notes.md:3919`, 250/250) both runs — re-pinned live, this is the baseline the
wiring step (§11.3) must preserve. `turn3-rockslide.json`/`turn3-endeavor.json`
re-confirm the SAME counts §10.4 already pinned in this lane's own worktree
(the concurrent MAIN-lane wiring of §10's own plan lands in a different
worktree and had not merged into this one as of this session), proving this
session's read-only recon (plus the new unwired
`turn4DoubleTeamPresentationStaging.ts` module) touched nothing live in
either lane's own scope. `npm test` (234 files, 3298 tests) and `npm run
build` both green in this worktree at the same commit.

### 11.5 Wiring landed, 2026-07-27 (main lane, bounded worker)

§11.3's 5-step plan executed as written. `presentationEventWindowBridge.ts`
gained `resolveDoubleTeamKickoffPresentationWindowContent` (step 1, the
`{message, statChange}` shape keyed on
`BattleScript_EffectStatUpAfterAtkCanceler`, no `hp` field).
`turn4DoubleTeamPresentationStaging.ts` gained
`resolveTurn4DoubleTeamWindowContent` (stages the chain, calls the new
bridge) and `resolveTurn4DoubleTeamKickoffLines` now reads
`content.message.messageId` from that bridge output instead of hardcoding
the `"STRINGID_USEDMOVE"` string literal directly — closing the doc/code gap
this module's own comment already claimed ("re-derived ... from THIS staged
run's own real event stream") but the code didn't yet do. `battleScene.ts`'s
`drawTurn4KickoffText` (step 2) now draws
`TURN4_DOUBLETEAM_KICKOFF_LINE1/2` (resolved once at module load from the
staged run) instead of the raw `TURN_KICKOFF_LINE1`/`LINE2` literals;
`drawDoubleTeamClones`/`drawStatsBanner`'s own firing was left ungated on
`statChange` (the scout's own step-2 note called this optional — the
existing dispatch booleans already reproduce the pixels correctly, and
gating added risk with no pixel benefit). Steps 3/4 (steady HP overlays,
PP-readout assumption) left untouched as directed — both still named,
unwired residuals.

**No literal died.** `TURN_KICKOFF_LINE1`/`LINE2` (`battleMenu.ts:1086,1088`)
stay defined and in active use by every OTHER turn's own kickoff/held-text
call site in `battleScene.ts` (turn 1's `drawTurnKickoffText`, turn 2's
`drawTurn2KickoffText`, and `drawTurn4RockSlideWindow`'s own dead
pre-`statRoseStart` branch, unreachable in this trace per §11's own preamble
correction) — only `drawTurn4KickoffText`'s own one call site was retired
from reading them directly.

**Acceptance, re-verified this session:** baseline sweep run BEFORE the
change matched every recorded count exactly (no pre-existing drift), then
re-run AFTER the change with byte-identical results — `turn4-doubleteam.json`
250/250 (two runs), `turn4-rockslide.json` 250/250, `turn1-rockslide.json`
256/256, `turn3-rockslide.json` 256/256, `turn3-endeavor.json` 192/192,
`turn5-rockslide.json` 256/256, `turn5-faint.json` 110/110. `npm test`
247/247 files, 3385/3385 tests (+4 over this session's own start: 3 new
bridge tests + 1 new staging-module test). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers).

## 12. Prep-scout for the NEXT window, 2026-07-27 (`turn6-featherdance.json`), side lane

Read-only recon plus one unwired staging module/test — the same §8/§9/§10/§11
contract, self-picked this time per the brief's own selection logic ("the
smallest already-exact committed OFF-profile trace whose content is NOT yet
kernel-driven"). This session touches no `battleScene.ts`,
`presentationEventWindowBridge.ts`, or any other production file. All line
numbers below are re-verified against this worktree's own `HEAD` (`62fa07d`).

**Selection.** §11.1's own preamble named the candidate family directly:
"turns 2, 5-11 kickoffs and the turn 13/15/17 KO/party/loss windows." Turn
5's own kickoff (ENDEAVOR) is already wired (§9/`turn5EndeavorPresentation
Staging.ts`), so the real remaining single-move-kickoff candidates are turns
2, 6, 7, 8, 9, 10, 11, plus the much larger turn 13/15/17 KO/party/loss
family. A frame-count survey of every committed trace in `tools/compare/
traces/` for those candidates gives:

| trace | frames | leaf draw function |
| --- | --- | --- |
| `turn6-featherdance.json` | **90** | `drawTurn6FeatherDanceKickoffText` (unwired) |
| `turn2-dragonbreath-projectiles.json` | 61 | sub-slice of `drawTurn2KickoffText` (a much larger function that ALSO renders turn 2's own ENDEAVOR squish half — messier surface, not a clean single-move kickoff) |
| `turn2-endeavor.json` | 77 | ditto, `drawTurn2KickoffText`'s ENDEAVOR half |
| `turn7-feathers.json` | 145 | `drawTurn7FeatherDanceKickoffText` (unwired) |
| `turn8-feathers.json` | 162 | `drawTurn8FeatherDanceKickoffText` (unwired) |
| `turn9-quickattack.json` | 169 | `drawTurn9QuickAttackWindow` (unwired) |
| `turn10-aerialace.json` | 93 | `drawTurn10AerialAceWindow` (partially unmodeled per its own doc, `battleScene.ts:6889-6895` history — not a clean pick) |
| `turn11-featherdance.json` | 178 | `drawTurn11FeatherDanceWindow` (unwired) |

The turn 13/15/17 KO/party/loss family was surveyed separately (`turn13-
switchin.json` 242, `turn15-party-select.json` 200, `turn15-sendout-rung*`
16-195, `turn17-rung*` 41-255) and rejected for THIS checkpoint: its own
draw path (`drawTurn15PartySelectWindow` and its ~15 own helper functions,
`battleScene.ts:13359-14600`+) is an order of magnitude larger than every
prior §8-11 pick (a multi-hundred-line ball/particle/affine/healthbox-slide
mechanism, `docs/turn15-sendout-notes.md`'s own 6-rung dossier), not a single
bounded leaf function — auditing "every input" to this checkpoint's own
established depth would not fit a 60-minute bounded session. It is ALSO
blocked on a much larger kernel gap than any single move: the `switch`
semantic event (`battleScriptEvents.ts:159`) is declared but has **zero**
production emission sites anywhere in `src/engine/` today (re-confirmed live
this session — `grep -rn 'kind: "switch"' src/engine/*.ts` finds only the
type declaration and an unrelated same-named `BattleCommandDecision` kind in
`battleDecisionBoundary.ts`, a different namespace entirely), even though
the switch-IN mechanism itself is executable (`battleScriptSwitchinOpcode.ts`/
`battleScriptOpenPartyScreenOpcode.ts` both exist and are wired into the
opcode table). That is real, worth flagging for a dedicated future
checkpoint of its own, but is a materially bigger lift than this one.

`turn6-featherdance.json` (90 frames, `docs/battle-turn-notes.md` §28,
`captureFrames` 7307-7404) is therefore the smallest genuinely-in-scope
candidate: a single bounded leaf function
(`drawTurn6FeatherDanceKickoffText`, `battleScene.ts:8953-8975`, 23 lines),
already fully pixel-solved for its own content (§28's own "90/90, 0 diff"
history — only the feather/starburst sprite animation itself stays deferred,
unrelated to this window's own text/banner content), and genuinely NOT yet
kernel-driven: every string it draws is still a hardcoded `battleMenu.ts`/
`battleScene.ts` literal. It also newly requires an **opponent-target**
(non-self) stat-change bridge shape — every prior wired window
(`turn1`/`turn4` DOUBLE_TEAM) staged a SELF-target stat change; this is the
family's first genuinely different shape, matching this brief's own ask for
"what new bridge/event shape it needs."

### 12.1 Every input `turn6-featherdance.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing chain**, `drawFightSubmenuWindow`
(`battleScene.ts:5494-5598`, twelve `turnNResolved` boolean parameters):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn14Resolved`…`turn6Resolved` | `:5514-5589` | all false (else routes to turns 7-15's own dedicated dispatchers) |
| `turn5Resolved` | `:5590` | **true** — the one boolean that actually selects `drawTurn6FightSubmenuWindow(fb, t, sm)` (`:5596`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class every prior window's own dispatch chain already established |

**`drawTurn6FightSubmenuWindow`'s own inner chain** (`battleScene.ts:9067-9099`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `sm.openElapsed === null` | `:9068` | false (submenu already open) |
| `t < revealTick` (`TICK0 + sm.openElapsed + FIGHT_SUBMENU_OPEN_DELAY`) | `:9072-9073` | false (submenu fully revealed) |
| `sm.confirmElapsed !== null` | `:9077` | **true** — a REAL A-confirm press (this trace's own genuine button-press script, not a synthetic anchor like `TURN6_ROCKSLIDE_PRESS_TICK` below); `pressTick = TICK0 + sm.confirmElapsed` resolves to **7345** for this trace (derived by inverting `turn6FeatherDanceTextStartTick`'s own `pressTick+13=7358` fit against the oracle-pixel-confirmed first-changing-tick, independently cross-checked against `turn6AtkFellTextStartTick`'s own `pressTick+314=7659` fit — both agree on 7345) |
| `t >= textStart` (`turn6FeatherDanceTextStartTick(pressTick)`, `:8864-8866`, `pressTick+13`) | `:9079-9080` | true for most of this trace's own capture range (7358-7404); the capture's own leading ticks (7307-7357) render the pre-text reveal/settle frames of this SAME function's fallthrough path (`:9085-9098`), still inside `drawTurn6FightSubmenuWindow`, just before its own text branch fires |

**`drawTurn6FeatherDanceKickoffText`'s own body** (`battleScene.ts:8953-8975`):

| input | line(s) | condition / role in THIS window |
| --- | --- | --- |
| `t >= rockSlideTextStartTick(TURN6_ROCKSLIDE_PRESS_TICK)` | `:8960` | **false** for this trace's entire capture range (7307-7404 all `< 7765` — `TURN6_ROCKSLIDE_PRESS_TICK`=7372 is a SEPARATE synthetic anchor for turn 6's own LATER ROCK_SLIDE half, unrelated to this real trace's own `pressTick`=7345) — so this window never reaches the `drawTurn6RockSlideWindow` handoff at all; that half is a genuinely different, already-out-of-scope mechanism |
| `turn6StatFallEva(t, pressTick)` (`battleMenu.ts:1499-1506`) | `:8966-8967` | `null` for this trace's entire capture range (needs `d = t-pressTick >= TURN6_STATFALL_RAMP_START_DELAY`, past tick 7404) — the stat-fall BG1 banner graphic is NEVER drawn within this trace's own captured frames, a real but out-of-capture-range residual, not a bug |
| `turn6AtkFellTextStartTick(pressTick)` (`battleMenu.ts:1563-1565`, `pressTick+314=7659`) | `:8969-8974` | **false** for this trace's entire capture range (max captured tick 7404 < 7659) — so `TURN6_ATKFELL_LINE1/2` is likewise never actually rendered by this specific committed trace; only `TURN6_FEATHERDANCE_LINE1/2` (the kickoff message) is pixel-exercised here. Both the stat-fall banner and the ATK-fell text ARE staged and proven reachable by §12.2 below (useful groundwork for whichever future capture extends this window's own range), but this trace's own 90 frames do not exercise them — named precisely, not glossed over |
| `TURN6_FEATHERDANCE_LINE1`/`LINE2` ("Foe PIDGEOTTO used"/"FEATHERDANCE!", `battleScene.ts:8860-8861`) | `:8973` | the ONE literal this trace's own captured frames actually render, via `turn6FeatherDanceTextVisibleChars(t, pressTick)` (`:8869-8871`, same 1-tick/char mechanism every kickoff text in this dossier uses) |

**Hardcoded strings**, both defined but only the first is pixel-exercised by
this specific trace (see table above): `TURN6_FEATHERDANCE_LINE1/2`
(`battleScene.ts:8860-8861`), `TURN6_ATKFELL_LINE1/2` ("ONIX’s ATTACK"/
"harshly fell!", `battleMenu.ts:1559-1560`).

**Tick anchors** (all `pressTick`-relative offsets): `turn6FeatherDanceText
StartTick`=+13 (`battleScene.ts:8864-8866`), `turn6AtkFellTextStartTick`=+314
(`battleMenu.ts:1563-1565`), `TURN6_STATFALL_RAMP_START_DELAY`/`_HOLD_END_
DELAY`/`_RAMPDOWN_ANCHOR_DELAY` (`battleMenu.ts`, `turn6StatFallEva`'s own
constants) — all presentation-native, same "not a kernel gap" finding §8.4
Option A already established for this whole function family, re-confirmed
here a fifth time.

**The hidden-state finding this brief's own §11 precedent asks to flag:**
Onix's own ATTACK stat stage is never read from anywhere in
`drawTurn6FeatherDanceKickoffText` — the function draws the SAME hardcoded
kickoff text and (once past this trace's own capture range) the same
hardcoded "harshly fell!" literal regardless of what Onix's real stage
actually is or was. The real battle-content fact this window renders —
Onix's ATTACK dropping a first, genuine 6 -> 4 (two full stages) — exists
nowhere in `battleScene.ts`'s own state. §12.2 stages it for the first time.

### 12.2 Staged proof: what the kernel emits today for this window's own content

EFFECT_ATTACK_DOWN_2 has been executable since before this session
(`docs/executable-frontier-census.md:114`, `BattleScript_EffectAttackDown2`).
`src/engine/turn6FeatherDancePresentationStaging.ts` (new, **unwired** — not
imported by `battleScene.ts` or any production file, and does NOT add a
resolver to `presentationEventWindowBridge.ts` either, per this checkpoint's
own contract) stages Pidgeotto's own real turn-6 FEATHER_DANCE use: real
level-50 stats for BOTH battlers (`docs/turn6-notes.md` §4's own RAM-
confirmed snapshot table — ONIX atk/def/spd/spA/spD 51/187/76/36/72, HP 31;
PIDGEOTTO 98/61/77/56/56, HP 156), real MOVE_FEATHER_DANCE (id 297),
**opponent**-targeted (attacker=battler1/PIDGEOTTO, target=battler0/ONIX —
the first module in this family to stage a genuinely non-self stat change),
real pre-move ATK stage 6 (neutral — a genuine FIRST use, unlike turn 4's own
second-use evasion case), and a real recorded RNG seed.

**The RNG seed is derived, not RAM-read directly, and this is flagged
explicitly rather than silently trusted:** `docs/turn6-notes.md` §3's own
RNG ledger records the value AFTER Pidgeotto's own accuracy roll
(`1484887866` at tick 7356, exactly 1 `Random()` step), not the seed
entering it. This module inverts the documented LCG step (`next =
1103515245*seed + 24691 mod 2^32`) to recover `seed = 538069379`, then
verifies the round-trip forward reproduces the SAME documented post-roll
value — checked by this module's own test (`rngValueAfter` assertion), not
an unverified guess. Unlike DOUBLE_TEAM's own EFFECT_EVASION_UP route (which
skips `accuracycheck` entirely), FEATHER_DANCE's real script
(`BattleScript_EffectStatDown`, `reference/pokeemerald/data/battle_scripts_
1.s:534-553`) DOES run one — accuracy 100 always passes it, but it still
consumes a real `Random()` call, matching the ledger's own count exactly
(verified live: `rngCalls` is 1, not 0).

```
atkStageAfter: 4   (6 -> 4, matching the real RAM-confirmed turn-6 FIRST
                     drop, docs/turn6-notes.md §4 -- not a repeat use)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE"}                    sourceLabel: BattleScript_EffectStatDown
  set-battler-pp-data           {battler:1, movePosition:2, pp:14}                  sourceLabel: BattleScript_EffectStatDown (15 -> 14, RAM-confirmed first use, docs/turn6-notes.md §4)
  stat-stage-change             {battler:0, stat:"attack", from:6, to:4}            sourceLabel: BattleScript_EffectStatDown
  animation                     {animationId:"MOVE_ANIMATION", battler:1, arguments:["297","0","0","0","0","0"]}   sourceLabel: BattleScript_StatDownDoAnim
  animation                     {animationId:"STATS_CHANGE", battler:0, arguments:["46"]}                          sourceLabel: BattleScript_StatDownDoAnim
  message                       {messageId:"STRINGID_DEFENDERSSTATFELL"}           sourceLabel: BattleScript_StatDownPrintString  (NOT STRINGID_ATTACKERSSTATFELL -- target===activeBattler for an opponent-target move picks the "defender's own" string variant, battleScriptStatBuffs.ts:276-279, the exact opposite-looking-but-same-code-path result §11.2 already found for DOUBLE_TEAM's self-target case)
  set-battler-sprite-visibility {battler:1, invisible:false}                       (moveend pass-through)
  set-battler-sprite-visibility {battler:0, invisible:false}                       (moveend pass-through)
```

No `hp-change`/`health-bar-update`/faint-family event anywhere in this
stream — confirmed by a dedicated test assertion. The `STATS_CHANGE`
animation argument (`46`) is independently decodable, same discipline
§11.2 established for the rise case: `Cmd_setgraphicalstatchangevalues`'s
own DECREASE-side formula (`battleScriptStatbuffchangeOpcode.ts:129,141,146`)
gives `STAT_ANIM_MINUS2(45)+1 + STAT_ATK(1) - 1 = 46` for a -2 ATK drop —
same formula shape, opposite direction table entry, as the rise case.

**One glyph residual, discovered live, not by inspection alone:** resolving
`STRINGID_DEFENDERSSTATFELL`'s own template
(`{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}`) through the SHARED
`resolveBattleStringLines` (`battleStringResolver.ts`, unmodified this
session) produces `"ONIX's ATTACK"` — a straight ASCII apostrophe — not the
already-committed `TURN6_ATKFELL_LINE1`'s own `"ONIX’s ATTACK"` (curly
U+2019, `battleMenu.ts:1559`'s own doc citing the font's charmap-only-curly
convention). The extracted `battle-message-templates.json` segment for this
template's own literal `"'s "` text run is a plain ASCII apostrophe (an
artifact of extraction, `tools/extract/extract-battle-messages.ts`), and
`resolveBattleStringLines` has never before been exercised against an
apostrophe-bearing template in production (every prior wired window's own
`STRINGID_USEDMOVE`/`STRINGID_DEFENDERSSTATROSE`/`STRINGID_ATTACKERSSTATROSE`
calls happened to avoid one — DOUBLE_TEAM's own "Foe GROVYLE used" has none;
`STAT_ROSE_LINE1`'s "Foe GROVYLE’s evasiveness" is still a literal, never
routed through this resolver, §8.3/§5). This is a REAL, newly-exposed gap
in the shared resolver (out of THIS checkpoint's own one-staging-module
contract to fix — `battleStringResolver.ts` is a shared production file),
named here precisely so the next wiring worker doesn't rediscover it from
scratch: any window resolving a `'S`-possessive template through this
resolver needs either a charmap-aware post-process or a literal `’`
correction in the template extraction itself.

**Mapping table** (turn-N input -> kernel event / gap), current as of this
staged run:

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn14Resolved`…`turn5Resolved` dispatch chain + `drawTurn6FightSubmenuWindow`'s own inner `sm`/tick gates (§12.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found |
| `TURN6_FEATHERDANCE_LINE1`/`LINE2` ("Foe PIDGEOTTO used\nFEATHERDANCE!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, re-derived from a real run of THIS turn's own script** — `resolveTurn6FeatherDanceKickoffLines` (this module) resolves to `["Foe PIDGEOTTO used", "FEATHERDANCE!"]`, byte-identical. This IS pixel-exercised by the committed trace (captured ticks 7358-7404) |
| Onix's own ATTACK stat stage, 6 -> 4 (never read anywhere in `battleScene.ts` today, §12.1's own hidden-state finding) | `stat-stage-change{battler:0, stat:"attack", from:6, to:4}` | **emitted today, proven this session** — the real production emission site (`battleScriptStatBuffs.ts:296-303`) is reachable end-to-end from FEATHER_DANCE's own real script entry with turn 6's own real pre-move stage and a real derived RNG seed. NOT pixel-exercised by this trace's own captured frames (the stat-fall banner and ATK-fell text both open past tick 7404, §12.1) — staged and proven regardless, useful groundwork for a future capture-range extension |
| `TURN6_ATKFELL_LINE1`/`LINE2` ("ONIX’s ATTACK\nharshly fell!") | `message{messageId:"STRINGID_DEFENDERSSTATFELL"}` | **message id proven** (`resolveTurn6AtkFellLines`), but resolving it through the shared string resolver reveals the ASCII-vs-curly-apostrophe residual above — a real, DIFFERENT-from-content gap. NOT pixel-exercised by this trace (out of captured range) |
| `turn6StatFallEva`/`turn6StatFallBg1Y` (`drawTurn6StatFallBanner`'s own ATK-decrease BG1 graphic) | `animation{animationId:"STATS_CHANGE", arguments:["46"]}` | **kind AND a decodable stat/direction/magnitude payload emitted today, proven** — same "present, decodable, not currently a required gate" finding §11.2 made for the rise case's own `STATS_CHANGE` payload. NOT pixel-exercised by this trace (out of captured range) |
| `doubleTeamCloneOffsets`-style choreography — N/A here (FEATHER_DANCE has no equivalent clone mechanism; only `attackanimation`/`waitanimation` fire) | `animation{animationId:"MOVE_ANIMATION"}` | **kind emitted today, proven** — payload `arguments:["297","0","0","0","0","0"]` (move id, real values) |
| PP readout (Pidgeotto's own FEATHER_DANCE, first use, 15->14) | `set-battler-pp-data{battler:1, movePosition:2, pp:14}` | **emitted today, proven this run**, and independently RAM-confirmed (`docs/turn6-notes.md` §4's own table — unlike §11.2's own flagged-unverified 14->13 PP assumption for DOUBLE_TEAM, this one IS independently RAM-checked) |
| ONIX/PIDGEOTTO HP (31/156) | no `hp-change` events anywhere in this stream | **no kernel event needed** — FEATHER_DANCE deals no damage, same "steady-state read, not a drain endpoint" finding every prior sibling module's own mapping table already made for its own out-of-scope HP reads |

**What this staged run does and does not prove:** it proves the real
FEATHER_DANCE opponent-target chain reproduces turn 6's own specific real
transition (ATK 6->4, a genuine first use) and that the resulting
`stat-stage-change`/`STATS_CHANGE`-animation/`STRINGID_DEFENDERSSTATFELL`
triad is genuinely reachable end-to-end through the real script — the first
proof in this dossier of the **opponent-target** route through
`changeStatBuffs` (every prior wired case was self-target). It does NOT
prove `presentationEventWindowBridge.ts` needs no new shape: it does. Unlike
DOUBLE_TEAM's own single-`sourceLabel` triad
(`BattleScript_EffectStatUpAfterAtkCanceler` covering message + stat-change
together), THIS window's own two messages sit under TWO DIFFERENT
`sourceLabel`s — `STRINGID_USEDMOVE` and the `stat-stage-change` event share
`BattleScript_EffectStatDown`, but `STRINGID_DEFENDERSSTATFELL` sits under
the separate `BattleScript_StatDownPrintString` — a genuinely different
shape from every prior wired sibling, named precisely here so the next
wiring worker builds the right bridge function instead of copying the
single-label pattern verbatim (§12.3 step 1).

### 12.3 Ordered wiring plan (acceptance: `turn6-featherdance.json` still passes at 90/90, regression sweep over the adjacent turn 6/1/5 traces unchanged)

1. Add a `resolveFeatherDanceKickoffPresentationWindowContent`-shaped
   sibling to `presentationEventWindowBridge.ts` (same null-safe pattern as
   `resolveDoubleTeamKickoffPresentationWindowContent`, but reading from TWO
   `sourceLabel`s, not one, per §12.2's own finding): key the
   `message{messageId:"STRINGID_USEDMOVE"}` + `stat-stage-change` pair on
   `provenance.sourceLabel === "BattleScript_EffectStatDown"`, and
   separately key the `message{messageId:"STRINGID_DEFENDERSSTATFELL"}` (or
   `..._ATTACKERSSTATFELL`, for whichever future self-target ATK/DEF/etc.
   down move needs it) on `provenance.sourceLabel ===
   "BattleScript_StatDownPrintString"` — return shape
   `{message, statChange, statFellMessage}` (no `hp` field, matching
   §12.2's own "no damage component" finding).
2. Wire `drawTurn6FeatherDanceKickoffText` (`battleScene.ts:8953-8975`) to
   source `TURN6_FEATHERDANCE_LINE1/2`'s text from step 1's resolved
   `message` (mechanically identical `STRINGID_USEDMOVE` mapping, zero new
   resolver work beyond what turn 1's own gap-5 resolver already supplies,
   §8.5 step 1) — the feather-sprite choreography and `drawTurn6RockSlideWindow`
   handoff stay byte-for-byte unchanged (no kernel-timestamp input needed,
   §8.4 Option A applies unchanged a sixth time).
3. Wiring `TURN6_ATKFELL_LINE1/2` from step 1's `statFellMessage` needs the
   glyph residual (§12.2) fixed FIRST — either a charmap-aware
   post-processing pass in `resolveBattleStringLines` or a corrected
   `battle-message-templates.json` extraction (curly `’` in the source
   template segment) — otherwise the wired render would regress the
   already-pixel-correct literal by one glyph. Named as an explicit
   PREREQUISITE substep, not a parallel nice-to-have: wiring this line
   before fixing the resolver would fail its own regression sweep. NOTE:
   this trace's own captured frames (7307-7404) never reach this text phase
   (opens at pressTick+314=7659) — this step is real groundwork for a FUTURE
   capture-range extension of this same window, not required for THIS
   trace's own 90/90 acceptance bar.
4. The `STATS_CHANGE`/stat-fall-banner wiring (`drawTurn6StatFallBanner`,
   `turn6StatFallEva`) is similarly real but out of THIS trace's own
   captured range (§12.1) — named as a residual for the same future
   extension, not blocking this step.
5. Re-run `npm run compare -- turn6-featherdance.json` and confirm it still
   matches at **90/90** (recorded count, `docs/battle-turn-notes.md` §28,
   re-pinned live in §12.4) before/after, PLUS a regression sweep of
   `turn6-rockslide-a.json` (255/255, the ALREADY-nominally-separate
   ROCK_SLIDE tail of this exact same turn — the step most likely to
   regress if the new bridge function's `sourceLabel` keys are too broad),
   `turn6-statfall.json` (127/127, shares `turn6StatFallEva`/`Bg1Y`),
   `turn6-feathers.json` (235/235, shares the feather sprite mechanism),
   `turn6-menu.json` (44/44, shares the settled-submenu chrome),
   `turn1-rockslide.json` (256/256, shares the message-box/font mechanism —
   most likely to catch an apostrophe-glyph regression from step 3), and
   `turn5-rockslide.json`/`turn4-doubleteam.json` (256/256, 250/250 — the
   checkpoint's own established acceptance bar, re-pinned live in §12.4).

### 12.4 Comparator re-pin

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn6-featherdance.json --summary   (run 1)
90/90 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-featherdance.json --summary   (run 2, determinism check)
90/90 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-rockslide-a.json --summary
255/255 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-statfall.json --summary
127/127 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-feathers.json --summary
235/235 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-menu.json --summary
44/44 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-doubleteam.json --summary
250/250 frames matched -> tools/compare/out/latest
```

`turn6-featherdance.json` matches its recorded count (`docs/battle-turn-
notes.md` §28, 90/90) both runs — re-pinned live, this is the baseline
§12.3's own wiring step must preserve. Every regression trace matches its
own already-established count with zero drift, proving this session's
read-only recon (plus the new unwired `turn6FeatherDancePresentationStaging.ts`
module) touched nothing live in this lane's own scope. `npm test` **250/250
files, 3417/3417 tests** (+1 file/+8 tests over this session's own start —
one new staging-module test file only). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (zero new barriers, no canonical
recording import added).

### 12.5 Wiring landed, 2026-07-27 (main lane, bounded worker)

§12.3's plan executed for steps 1/2/5 as written; steps 3/4 left as the
named, out-of-this-trace's-scope residuals the plan itself called them (no
mismatch found — the bridge shape §12.2/§12.3 predicted fit the real event
stream exactly).

`presentationEventWindowBridge.ts` gained
`resolveFeatherDanceKickoffPresentationWindowContent` (step 1): the first
OPPONENT-target sibling in this family, and the first to read from TWO
`sourceLabel`s — `BattleScript_EffectStatDown` for the `message{STRINGID_
USEDMOVE}` + `stat-stage-change` pair, `BattleScript_StatDownPrintString`
for the separate `STRINGID_DEFENDERSSTATFELL` message — returning
`{message, statChange, statFellMessage}` (no `hp` field, per §12.2's own
"no damage component" finding). `presentationEventWindowBridge.test.ts`
gained 3 new cases (the happy-path triad plus 2 null-guard cases exercising
the new two-`sourceLabel` shape specifically).

`turn6FeatherDancePresentationStaging.ts`'s own local (pre-wiring)
extraction in `resolveTurn6FeatherDanceWindowContent` is retired in favor of
calling the new bridge function directly — same "stage the chain, then call
the shared bridge" shape §11.5 established for
`turn4DoubleTeamPresentationStaging.ts`. `resolveTurn6FeatherDanceKickoffLines`
now reads `content.message.messageId` from the bridge output instead of
hardcoding the `"STRINGID_USEDMOVE"` literal directly (closing the same
doc/code gap class §11.5 closed for turn 4); `resolveTurn6AtkFellLines`
(still unwired, step 3) now reads `content.statFellMessage.messageId`/
`content.statChange.{from,to}` from the same bridge output instead of the
old ad hoc `statFell` field names. `turn6FeatherDancePresentationStaging.test.ts`'s
own final assertion updated to match the bridge's return shape (`message`/
`statChange`/`statFellMessage`, each carrying `substitutions` where
applicable) — mechanical, no behavior change (byte-identical values).

`battleScene.ts`'s `drawTurn6FeatherDanceKickoffText` (step 2) now draws
`TURN6_FEATHERDANCE_KICKOFF_LINE1/2` (a new constant, resolved once at
module load from the staged run via `resolveTurn6FeatherDanceKickoffLines`)
in its own FEATHERDANCE-text branch, instead of the raw `TURN6_FEATHERDANCE_
LINE1`/`LINE2` literals. Nothing else in that function changed: the
feather-sprite choreography, the `eva`/stat-fall-banner gate, the
`atkFellStart` branch (still reading the raw `TURN6_ATKFELL_LINE1/2`
literals directly, per step 3's own prerequisite), and the ROCK_SLIDE
handoff are all byte-for-byte unchanged.

**No literal died.** `TURN6_FEATHERDANCE_LINE1`/`LINE2` (`battleScene.ts:
8860-8861`) stay defined and in use by every OTHER turn's own repeat-
FEATHER_DANCE kickoff call site in this file — `drawTurn7FeatherDanceKickoffText`,
`drawTurn8FeatherDanceKickoffText`, `drawTurn11FeatherDanceWindow` (turns
7/8/11's own 2nd/3rd/4th uses of the identical text, all explicitly out of
this step's own scope, §12's own selection note) — only
`drawTurn6FeatherDanceKickoffText`'s own one call site was retired from
reading them directly. `TURN6_ATKFELL_LINE1/2` (`battleMenu.ts:1559-1560`)
are untouched entirely (step 3 not executed this pass, per the brief's own
out-of-scope list and §12.3's own prerequisite note about the glyph
residual).

**No mismatch found.** The bridge shape §12.2/§12.3 predicted — a
two-`sourceLabel` read, the first opponent-target case in this dossier —
fit the real event stream exactly as staged: no rework was needed once the
bridge function was written against the same event dump §12.2 already
captured.

**Acceptance, re-verified this session:** the full §12.4 regression sweep
run BEFORE this change (on the pristine `HEAD`, via `git stash`) matched
every recorded count exactly — `turn6-featherdance.json` 90/90,
`turn6-rockslide-a.json` 255/255, `turn6-statfall.json` 127/127,
`turn6-feathers.json` 235/235, `turn6-menu.json` 44/44,
`turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
`turn4-doubleteam.json` 250/250 — no pre-existing drift. Re-run AFTER the
change (`turn6-featherdance.json` twice, for a determinism check) reproduced
every one of those counts byte-identically. `npm test` **252/252 files,
3446/3446 tests** (+3 over this session's own start, 252/3443 — the 3 new
`presentationEventWindowBridge.test.ts` cases only; `turn6FeatherDancePresentationStaging.test.ts`'s
own test count is unchanged, one existing assertion updated in place).
`npm run build` clean. `executableFrontierRatchet.test.ts` unmoved (6/6,
zero new barriers).

## 13. Prep-scout for the NEXT window, 2026-07-27 (`turn2-endeavor.json`), side lane

Read-only recon plus one unwired staging module/test — the same §8-§12
contract (recon + staged proof + plan, **no production wiring**). This
session touches no `battleScene.ts`, `presentationEventWindowBridge.ts`, or
any other production file. All line numbers below are re-verified against
this worktree's own `HEAD` (`bbd6e23`, the commit recording §12.5's landed
wiring).

### Candidates weighed (smallest input surface, not by interest)

Per this brief's own instruction, this session also weighs the "capture-
range EXTENSION" candidate §12.3 steps 3/4 named as future work, alongside
fresh windows, honestly rather than defaulting to either:

| trace | frames | leaf function(s) | own new work needed | blocked on |
| --- | --- | --- | --- | --- |
| `turn6-statfall.json` (EXTENSION-shaped: already a committed, separate trace covering §12.3 steps 3/4's own named residual — `drawTurn6StatFallBanner`'s BG1 graphic and the START of `TURN6_ATKFELL_LINE1/2`) | 127 (range 7558-7684) | `drawTurn6FeatherDanceKickoffText`'s own `eva`/`atkFellStart` branches, `battleScene.ts:9354-9361` | **ZERO new staged proof** — §12.2's own `turn6FeatherDancePresentationStaging.ts` already staged and proved this EXACT event chain (`stat-stage-change{6->4}`, `STATS_CHANGE` animation arg `46`, `STRINGID_DEFENDERSSTATFELL` message); only wiring is left | **the KNOWN PREREQUISITE**, hit directly — verified fresh this session: `turn6AtkFellTextStartTick(pressTick)=7659`, and at this trace's own last captured tick (7684, offset 25) `turn6AtkFellTextVisibleChars` = 26, past the 5th character of `"ONIX’s ATTACK"` — the curly apostrophe IS pixel-exercised by this trace's own committed capture, not just a future extension's problem |
| `turn7-feathers.json` | 145 (range 8439-8583) | `drawTurn7FeatherDanceKickoffText`'s kickoff-text branch, `:9346-9362` | **ZERO new staged proof** — this trace's own captured range sits entirely inside `docs/turn7-notes.md`'s own documented kickoff-text-and-animation hold (~8396-8685, re-verified §13.1), before turn 7's own ATK-fell transition (8686+) — the rendered text is byte-identical to the ALREADY-resolved `TURN6_FEATHERDANCE_KICKOFF_LINE1/2` (same attacker, same move, same `STRINGID_USEDMOVE`), a pure literal-swap wiring step, nothing new to stage | **nothing** — but also nothing NEW to prove for §13.2's own deliverable; the genuinely new fact this turn holds (ATK 4->2, a second application) sits past this trace's own captured range, groundwork only |
| `turn8-feathers.json` | 162 (range 9468-9629) | `drawTurn8FeatherDanceKickoffText`'s kickoff-text branch, `:9535-9552` | same shape as the row above (turn 8's own kickoff-text-only capture, verified against `docs/turn8-notes.md`'s own table: kickoff settles 9468, animation churns to ~9738, this trace ends 9629 — before the ATK-fell transition) | same as the row above — zero new work, zero new proof |
| `turn9-quickattack.json` / `turn9-quickattack-b.json` | 169 (10818-10986) / 77 (10945-11109) | `drawTurn9QuickAttackWindow`, `:10340-10360` | a genuine new HP-chain (Pidgeotto's QUICK_ATTACK vs. Onix, real damage) PLUS a genuinely new message class ("It's not very effective...", `TURN9_NOTVERYEFFECTIVE_LINE`, not yet seen in any wired window) — real, substantial new work | heavy animation-lane content sharing this same window (hitsplat/shake/flicker, `docs/battle-turn-notes.md` §36-§41's own still-open pixel residuals) — bigger and messier surface than a clean single-content leaf |
| `turn10-aerialace.json` | 93 (12345-12437, per §12's own survey) | `drawTurn10AerialAceWindow` | rejected again, same reason §12 already gave: **partially unmodeled** — mechanism 3's own residual and mechanism 4's reverted render are still-open pixel gaps (`docs/battle-turn-notes.md` §42-§44), not a clean, fully-solved pick |
| `turn11-featherdance.json` | 178 (13352-13529) | `drawTurn11FeatherDanceWindow`, `:11403+` | a genuinely new message class (the ATK-floor "won't go lower!" clamp text) | **the apostrophe residual, TWICE over** — `TURN11_ATKFLOOR_LINE1`/`LINE2` = `"ONIX’s ATTACK"` / `"won’t go lower!"` (`battleScene.ts:11242-11243`), both curly-apostrophe-bearing, both within this trace's own captured range (`docs/battle-turn-notes.md:6957`: "kickoff text typing + hold + ATK-floor message transition + reveal + hold") — worse-blocked than `turn6-statfall.json` above, and bigger |
| `turn13-sandattack.json` | 190 (15420-15650) | `drawTurn13SandAttackWindow`, `:11745+` | a genuinely NEW bridge shape (opponent-target ACCURACY-stat-down, not ATK — same `stat-stage-change` kind, different `stat` value) — real, substantial new work, no apostrophe in its own text (`"Foe PIDGEOTTO used"`/`"SAND-ATTACK!"`, `:11775-11776`) | size alone (190 frames, plus a target-accuracy banner mechanism this dossier hasn't staged before) — not the smallest surface today |
| `turn12-rockslide-miss.json` | 38 frames, but SPARSE across a 749-tick span (14625-15374) | spans kickoff text, ROCK_SLIDE attack, the miss message, AND the turn-13 resettled menu — four+ already-distinct functions, not one bounded leaf | the MISS message itself is new (a `message` event with no `hp-change`), but reusing `TURN8_MISS_LINE1/2` verbatim (`docs/battle-turn-notes.md:6963`) | **not a single bounded leaf function** — same "not a clean pick" reasoning §12 used to reject the turn 13/15/17 KO/party/loss family, just at smaller scale; wiring it would touch multiple dispatchers for one small new fact |
| turn 13/15/17 KO/party/loss family (`turn13-switchin.json` 242, `turn15-party-select.json` 200, `turn15/17`-rung traces 16-255) | — | `drawTurn15PartySelectWindow` + ~15 helpers | rejected again, unchanged from §12's own verdict | still an order of magnitude larger than any single-leaf pick; the `switch` semantic event (`battleScriptEvents.ts:159`) re-confirmed live this session to still have **zero** production emission sites (`grep -rn 'kind: "switch"' src/engine/*.ts` finds only the type declaration and the unrelated `BattleCommandDecision` namespace in `battleDecisionBoundary.ts`) — no change since §12 |
| `turn2-endeavor.json` | **77** (2894-2999) | `drawTurn2KickoffText`'s ENDEAVOR-text branch, `:6871-6906` | **ONE new staged hit chain** (Grovyle's turn-2 ENDEAVOR, Onix 117->101) reusing the ALREADY-proven `resolveRockSlidePresentationWindowContent`/`BattleScript_EffectEndeavor` shape `turn5EndeavorPresentationStaging.ts` established — same "parameterization, not a rebuild" shape §10 used for `turn3-rockslide.json` | **nothing** — no apostrophe in "Foe GROVYLE used"/"ENDEAVOR!", real RNG seed independently round-trip-verified against `battle1-turn2-ram-dump.json`'s own committed ledger |
| `turn2-endeavor-drain.json` / `turn2-dragonbreath.json` | 237 / 237 | same `drawTurn2KickoffText`, extended further (drain + DRAGON_BREATH half) | same ENDEAVOR work as the row above, PLUS DRAGON_BREATH's own separate hit chain | bigger surface than the row above for the SAME core new work — rejected on that basis, same discipline §3 used for `turn1-kickoff.json` |

**Pick: `turn2-endeavor.json`.** The two closest competitors are genuinely
different failure modes, not ties:

- `turn6-statfall.json` needs **zero new staged proof** (§12.2 already proved
  its exact event chain) but is **directly blocked** by the KNOWN
  PREREQUISITE glyph residual — re-verified fresh this session (not assumed
  from §12's own framing): this trace's own last captured tick (7684) sits
  26 characters into `"ONIX’s ATTACK\nharshly fell!"`, past the apostrophe.
  Per this brief's own tiebreak instruction ("if two candidates are
  otherwise close, prefer the one not blocked on it"), and this one is
  *directly*, not just adjacently, blocked.
- `turn7-feathers.json`/`turn8-feathers.json` are **not blocked** and need
  **zero bridge work**, but also have **zero new content to stage** for
  §13.2's own deliverable (their own captured ranges render byte-identical
  text to what §12.2 already proved) — a valid but hollow pick for a
  checkpoint whose own §13.2 asks for "staged kernel-event proof ... proving
  what the kernel emits TODAY for this window's own content."

`turn2-endeavor.json` is the smallest candidate that is BOTH unblocked AND
genuinely new: a real, un-staged hit chain (turn 2's own ENDEAVOR, distinct
HP endpoints and RNG seed from turn 5's already-wired instance), smaller by
frame count (77) than every other genuinely-new candidate (`turn6-statfall.json`
127, `turn9-quickattack-b.json` 77 but heavier/messier, `turn9-quickattack.json`
169, `turn11-featherdance.json` 178, `turn13-sandattack.json` 190), and
closes another simple, well-precedented link in the ENDEAVOR family (turn 5's
own third use is already wired; turn 2's first use and turn 3's second use,
named "genuinely comparable" but deprioritized in §10 purely for
ROCK_SLIDE-arc-closure reasons that no longer apply, are still both open —
turn 2 is the smaller of the two by frame count, 77 vs. `turn3-endeavor.json`'s
192).

### 13.1 Every input `turn2-endeavor.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing chain**, `drawFightSubmenuWindow` (`battleScene.ts:5636-5784`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn14Resolved`…`turn5Resolved` | `:5656-5740` | all false (else routes to turns 6-15's own dedicated dispatchers) |
| `sm.openElapsed`/`sm.closeElapsed` | `:5741,5755` | both past their own DMA-wait/close windows (ordinary settled-submenu path) |
| `sm.confirmElapsed !== null` | `:5762` | true — turn 2's own real A-confirm press already landed, `pressTick = TICK0 + sm.confirmElapsed` = `TURN2_CONFIRM_PRESS_TICK` = 2945 (`:6773`) |
| `(sm.cursor === 2 \|\| turn2Resolved) && !inTurn4DoubleTeamWindow` ternary | `:5773-5774` | `sm.cursor === 2` is true (DRAGON_BREATH slot, this turn's real cursor position) and `inTurn4DoubleTeamWindow` (`turn3Resolved && !turn4Resolved`) is false (turn 3 hasn't happened yet in this window) — selects `turn2KickoffTextStartTick(pressTick)` = 2954 |
| `t >= textStart` | `:5775` | true for most of this trace's own capture range (2954-2999); the leading ticks (2894-2953) render the pre-press idle/press-transient frames of the SAME outer function's fallthrough path, not `drawTurn2KickoffText` itself |
| `sm.cursor === 2` | `:5781` | **true** — the one condition that actually selects `drawTurn2KickoffText(fb, t, pressTick)` (`:5782`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class every prior window's own dispatch chain already established |

**`drawTurn2KickoffText`'s own body** (`battleScene.ts:6871-6906`):

| input | line(s) | condition / role in THIS window |
| --- | --- | --- |
| `dragonBreathStart = dragonBreathTextStartTick(pressTick)` = 2945+`DRAGONBREATH_TEXT_START_DELAY`(192, `:6561`) = 3137 | `:6872-6873,6899` | **false** for this trace's entire capture range (max captured tick 2999 < 3137) — the DRAGON_BREATH half (Onix's own later move, a separate hit chain) is never reached by this trace at all, genuinely out of scope, not glossed over |
| `drawEndeavorSquish(fb, t, pressTick, anchorOpponentAfterTurnHp, turn2KickoffBounceTick(t, pressTick), ROCK_SLIDE_MOVE_POWER)` | `:6881` | presentation-native squish/blend/droplet choreography (`:6515-6543`), `false` outside its own local window (`ENDEAVOR_SQUISH_TABLE`'s length, `t - pressTick - ENDEAVOR_SQUISH_START_DELAY`) — same "Option A, no kernel timestamp dependency" finding §8.4 already established for this whole function family, re-confirmed here a sixth time |
| `endeavorOnixHp(t, pressTick, anchorPlayerBattler.hp, anchorPlayerAfterTurnHp)` | `:6896`, formula at `battleMenu.ts:2701-2703` (`ENDEAVOR_HP_DRAIN_START_DELAY`=153, `:2685`) | drain start = pressTick+153 = 3098, **past this trace's own last captured tick (2999)** — the HP-bar drain itself is NEVER pixel-exercised by this specific committed trace (same "real but out-of-capture-range residual" class §12.1 found for the stat-fall banner); the call is a clamped no-op for every `t` in this trace's own range, matching `drawPlayerHealthboxHpOverlay`'s own no-op guard (`battleScene.ts:1682`, `hp === anchorPlayerBattler.hp`) |
| `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` ("Foe GROVYLE used"/"ENDEAVOR!", `battleMenu.ts:1086`/`:2635`) | `:6905` | the ONE content this trace's own captured frames actually render, via `turn2KickoffTextVisibleChars(t, pressTick)` (`battleMenu.ts:2656-2660`, `turn2KickoffTextStartTick`=pressTick+9, `:2651-2653`, total 26 chars) — fully typed and holding by tick 2980 (2954+26), well within this trace's own 2894-2999 range |

**RAM-dump / HP-constant reads** — re-verified against each constant's own
definition, same "evidence over inference" discipline every prior scout used:

| constant | value | real source | line(s) |
| --- | --- | --- | --- |
| `anchorPlayerBattler.hp` | 117 | asset read: `battle1-turn2-ram-dump.json`'s `battlerSnapshots.before_turn2.battler0.hp` (Onix, full HP, unchanged all of turn 1) | `battleScene.ts:1478-1480` |
| `anchorPlayerAfterTurnHp` | 101 | asset read: same file, `after_turn2.battler0.hp` (Onix's post-ENDEAVOR settle) | `:1482-1484` |
| `anchorOpponentAfterTurnHp` | 101 | asset read: `battle1-turn1-ram-dump.json`'s `battlerSnapshots.after_turn.battler1.hp` (Grovyle's own post-turn-1-ROCK_SLIDE settle — this window's own ENDEAVOR attacker HP, steady throughout) | `:1145-1147` |

All three are ALREADY asset-backed real values (same "no fresh RAM probing
needed, only a staged kernel proof" shape §10.1 found for `turn3-rockslide.json`).

**Hidden-state finding this brief's own §11/§12 precedent asks to flag:**
`drawEndeavorSquish`'s own `opponentHp` parameter (`anchorOpponentAfterTurnHp`,
101) is Grovyle's — the ATTACKER's — own steady HP, rendered on ITS healthbox
during the squish animation, not a drain endpoint of this window's own hit
chain at all (Grovyle isn't hit by its own ENDEAVOR). Its `stalePower`
parameter (`ROCK_SLIDE_MOVE_POWER`, 75, `battleScene.ts:6324`) is a genuine
game-mechanic quirk (`gBattleMovePower`'s own staleness — ENDEAVOR inherits
whatever power value the PRECEDING move left there, per the function's own
doc, `:6509-6513`) that affects the squish's own shake intensity but is
presentation-native, not kernel content — same "no plausible mapping" class
every prior window's own non-content parameter already established.

**Tick anchors** (all `pressTick`-relative offsets): `TURN2_CONFIRM_PRESS_TICK`
=2945 (real press, `battleScene.ts:6773`), `turn2KickoffTextStartTick`=+9
(`battleMenu.ts:2651-2653`), `ENDEAVOR_HP_DRAIN_START_DELAY`=+153 (`:2685`,
out-of-range residual for this trace), `dragonBreathTextStartTick`=+192
(`battleScene.ts:6561-6564`, out-of-scope for this trace entirely) — all
presentation-native, same "not a kernel gap" finding §8.4's Option A already
established, re-confirmed here a seventh time.

### 13.2 Staged proof: what the kernel emits today for this window's own content

EFFECT_ENDEAVOR has been executable since before this session (entry 464's
own registration, already exercised by `turn5EndeavorPresentationStaging.ts`)
— no opcode-registration research needed, only a real hit chain at THIS
turn's own real HP endpoints and RNG seed.
`src/engine/turn2EndeavorPresentationStaging.ts` (new, **unwired** — not
imported by `battleScene.ts` or any production file) mirrors
`turn5EndeavorPresentationStaging.ts`'s pattern verbatim: real Onix/Grovyle
level-50 stats (the same `tests/damageCalc.test.ts`-sourced blocks every
sibling module uses), real MOVE_ENDEAVOR (id 283), Grovyle (side 1) attacking
Onix (side 0) at this window's own real endpoints — Onix (target) 117,
Grovyle (attacker) 101, both read fresh this session from
`src/data/gen/battle1-turn2-ram-dump.json`'s own committed
`battlerSnapshots` (`before_turn2.battler0.hp`=117,
`battle1-turn1-ram-dump.json`'s `after_turn.battler1.hp`=101 — the SAME
asset `anchorOpponentAfterTurnHp` already reads in `battleScene.ts`).

**The RNG seed is turn 2's own real recorded value, identified (not
guessed) from `battle1-turn2-ram-dump.json`'s own already-committed
`rngLedger`** (9 entries, read fresh this session). The ledger's FIRST
entry (`atTick: 2983, fromValue: 4098214719, steps: 1, toValue: 2002721862`)
is the sole candidate for Grovyle's own ENDEAVOR accuracy roll — 38 ticks
after `TURN2_CONFIRM_PRESS_TICK` (2945), a single `Random()` step, and every
LATER entry attributes cleanly to DRAGON_BREATH's own 4-roll group
(3121/3135/3161/3164) then turn-pass/AI-cluster rolls from 3318 onward — the
same "4-roll group / AI-cluster tail" shapes `turn3RockSlidePresentationStaging.ts`'s
own module doc already established for this ledger family. **Verified live
this session, not guessed**: this exact seed forward-steps through the real
gen-3 LCG (`src/engine/rng.ts`'s own `advanceRngValue`, NOT plain `Number`
arithmetic — a first attempt using `(1103515245 * seed + 24691) >>> 0`
silently lost precision past float64's 53-bit exact-integer range and
produced a WRONG value, `2002721792` instead of the ledger's real
`2002721862`; caught by this module's own round-trip test, corrected to
reuse `rng.ts`'s own `BigInt`-based step function) to EXACTLY the ledger's
own recorded `toValue` — `tests/turn2EndeavorPresentationStaging.test.ts`'s
own dedicated assertion, 8 further assertions on the staged run itself:

```
targetHpAfter: 101   (117 -> 101, byte-identical to battleScene.ts's own
                       anchorPlayerBattler.hp/anchorPlayerAfterTurnHp pair
                       -- the real recorded turn-2 settle)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE", substitutions:[]}
  set-battler-pp-data           {battler:1, movePosition:0, pp:14}
  animation                     {animationId:"MOVE_ANIMATION", battler:1, arguments:[...]}
  play-se                       (neutral-effectiveness hit sound)
  animation                     {animationId:"HIT_ANIMATION", battler:0, arguments:[]}
  health-bar-update              {battler:0, healthValue:16}
  hp-change                     {battler:0, from:117, to:101}
  set-battler-sprite-visibility {battler:1, invisible:false}   (moveend pass-through)
  set-battler-sprite-visibility {battler:0, invisible:false}   (moveend pass-through)
```

Byte-for-byte the same shape as `turn5EndeavorPresentationStaging.ts`'s own
event list (`message`/`set-battler-pp-data`/`animation`x2/`play-se`/
`health-bar-update`/`hp-change`/`set-battler-sprite-visibility`x2, no
`resultmessage` — ENDEAVOR's own `bicbyte` unconditionally clears both
effectiveness flags before `resultmessage` runs, same finding turn 5's
module already made, re-exercised not re-derived). `attackstring`'s own
`sourceLabel` is `BattleScript_EffectEndeavor` (not
`BattleScript_HitFromAtkString` — this script's own `attackstring`/
`ppreduce` execute directly under its own top label), `hp-change`'s is
`BattleScript_HitFromAtkAnimation` (the trailing `goto`'s real jump target)
— `resolveRockSlidePresentationWindowContent`'s existing
`attackStringScriptLabel` override parameter bridges this unchanged, **zero
bridge edits needed**, the third time this exact override has been reused
(turn 3's ROCK_SLIDE needed no override; turn 5's and now turn 2's own
ENDEAVOR instances both do).

**What this staged run does and does not prove:** it proves the real
ENDEAVOR hit-chain mechanism reproduces turn 2's OWN specific recorded roll
(117->101, not merely "a real roll") using turn 2's OWN real ledger seed —
the RNG-seed identification is this module's own genuinely new work; the
`message`/`hp-change`/bridge mechanism itself was already proven twice over
by its own siblings (turn 3's ROCK_SLIDE, turn 5's own ENDEAVOR instance)
and is not re-derived here, only re-exercised. **The HP-drain endpoint
itself is NOT pixel-exercised by `turn2-endeavor.json`'s own committed
capture** (§13.1: the drain starts at pressTick+153=3098, past this trace's
last captured tick 2999) — proven and staged regardless, useful groundwork
for a future capture-range extension of this same window (the same
"groundwork, not required for THIS trace's own acceptance bar" shape §12.2/
§12.3 already established for `turn6-featherdance.json`'s own ATK-fell/
stat-fall content).

**Mapping table** (turn-N input -> kernel event / gap), current as of this
staged run:

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `turn14Resolved`…`turn5Resolved`/`sm.cursor`/`turn2KickoffTextStartTick` handoff dispatch chain (§13.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found |
| `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` ("Foe GROVYLE used\nENDEAVOR!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, re-derived from a real run of THIS turn's own script** — `resolveTurn2EndeavorAttackLines` (this module) resolves to `["Foe GROVYLE used", "ENDEAVOR!"]`, byte-identical, AND byte-identical to `turn5EndeavorPresentationStaging.ts`'s own output (same attacker/move) — this IS pixel-exercised by the committed trace (captured ticks 2954-2999) |
| `anchorPlayerBattler.hp` (117) | `hp-change`'s `from` | **emitted today, proven this session**: staged run's own event has `from: 117` |
| `anchorPlayerAfterTurnHp` (101) | `hp-change`'s `to` | **emitted today, proven this session**: staged run's own event has `to: 101` — the real recorded settle. NOT pixel-exercised by this trace's own captured frames (drain opens at pressTick+153=3098, past tick 2999, §13.1) — staged and proven regardless, groundwork for a future capture-range extension |
| `endeavorOnixHp(t, pressTick, from, to)` interpolation | `hp-change{from,to}` as the two endpoints | **fully unblocked**, no gap-4 kernel growth needed (Option A, same finding every sibling ENDEAVOR/ROCK_SLIDE module already established) |
| `anchorOpponentAfterTurnHp` (101, Grovyle's own steady overlay in `drawEndeavorSquish`) | not an `hp-change` endpoint in THIS window's own chain (Grovyle is the attacker, not hit) | **no kernel event needed for this specific read**, same "steady-state read, not a drain endpoint" finding every prior sibling module's own mapping table already made |
| `TURN2_CONFIRM_PRESS_TICK`/`turn2KickoffBounceTick` (bounce-overlay tick) | n/a — presentation-only timing, not battle content | not applicable, same class as every prior window's own non-content tick anchors |
| `drawEndeavorSquish` choreography (squish/blend/droplets, `ENDEAVOR_SQUISH_TABLE`) | `animation{animationId:"MOVE_ANIMATION"/"HIT_ANIMATION"}` | **kind emitted today, proven** (this run's own `animation` events) — gap 6 (no frame-by-frame payload) unchanged, same as every prior window |
| effectiveness SFX | `play-se` | **emitted today, proven**. Still moot for this checkpoint's own oracle (pixel-only, gap 8, unchanged) |
| `dragonBreathTextStartTick`/DRAGON_BREATH half (Onix's own later move) | out of scope — a SEPARATE hit chain, never reached by this trace at all (§13.1) | not applicable to this window |

### 13.3 Ordered wiring plan (acceptance: `turn2-endeavor.json` still passes at 77/77, regression sweep over the adjacent ENDEAVOR/kickoff traces unchanged)

This window's own text has NO apostrophe — the KNOWN PREREQUISITE resolver
fix is **not** a blocking substep for this specific wiring plan (unlike
`turn6-statfall.json`'s own path, named above and left for whoever picks
that candidate up next).

1. Wire `drawTurn2KickoffText`'s ENDEAVOR-text branch (`battleScene.ts:6905`)
   to source its two message lines from
   `turn2EndeavorPresentationStaging.ts`'s `resolveTurn2EndeavorAttackLines()`
   instead of the raw `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` literals —
   byte-identical content, mechanical swap (§8.5/§10.3's own precedent
   shape). `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2` themselves stay
   defined and in use by turn 3's own repeat ENDEAVOR call site
   (`:6965`, out of this step's own scope, same "only this window's own
   call site retired" discipline §12.5 established for
   `TURN6_FEATHERDANCE_LINE1/2`).
2. Wire `endeavorOnixHp`'s own `startHp`/`endHp` arguments at `:6896` to
   `turn2EndeavorPresentationStaging.ts`'s `resolveTurn2EndeavorHpEndpoints()`
   `{from, to}` instead of the direct `anchorPlayerBattler.hp`/
   `anchorPlayerAfterTurnHp` reads — byte-identical values (117, 101), zero
   pixel change expected since this trace's own capture never reaches the
   drain (§13.1/§13.2's own named residual) but the wiring closes the real
   kernel-proof gap regardless, matching this checkpoint's own "wire what's
   proven, not just what's pixel-exercised" convention (§9.3/§10.3 already
   did this for out-of-capture-range endpoints too).
3. `anchorOpponentAfterTurnHp`'s own steady overlay in `drawEndeavorSquish`
   (`:6881`, Grovyle's own hp during this window) stays a direct literal for
   this pass — not a drain endpoint of THIS window's own hit chain (§13.2's
   own mapping-table row), same "narrow to what's actually unblocked"
   discipline every prior window's own plan used for its adjacent
   out-of-scope reads.
4. Re-run `npm run compare -- turn2-endeavor.json` and confirm it still
   matches at **77/77** (recorded count) before/after, PLUS a regression
   sweep of `turn2-endeavor-drain.json` (237/237, the SAME function
   extended further — most likely to catch a step-2 HP-endpoint regression
   since it actually renders the drain), `turn2-dragonbreath.json` (237/237,
   shares this trace's own idle/press prefix then extends into the DRAGON_
   BREATH half untouched by this plan), `turn2-dragonbreath-projectiles.json`
   (61/61), `turn3-endeavor.json` (192/192, the SAME `TURN_KICKOFF_LINE1`/
   `TURN2_KICKOFF_LINE2` literals' other live call site — most likely to
   catch a step-1 regression if the swap is scoped too broadly),
   `turn3-rockslide.json` (256/256), `turn1-rockslide.json` (256/256),
   `turn5-rockslide.json` (256/256), `turn4-doubleteam.json` (250/250), and
   `turn6-featherdance.json` (90/90) — the checkpoint's own established
   acceptance bar, matching the exact live counts §13.4 already re-pinned
   this session.

**Residual named for whoever picks up `turn6-statfall.json` next** (not this
plan's own scope): wiring `TURN6_ATKFELL_LINE1/2`/the stat-fall banner needs
the apostrophe-glyph resolver fix FIRST, per the KNOWN PREREQUISITE — either
a charmap-aware post-process in `resolveBattleStringLines`
(`battleStringResolver.ts`) or a corrected `battle-message-templates.json`
extraction (curly `’` in the source template's `'s ` run,
`tools/extract/extract-battle-messages.ts`), confirmed THIS session to be
directly pixel-exercised by that trace's own already-committed capture (not
merely a future-extension concern) — named here precisely so the next
worker who picks that candidate doesn't rediscover the blocker from scratch.

### 13.4 Comparator re-pin

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn2-endeavor.json --summary   (run 1)
77/77 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-endeavor.json --summary   (run 2, determinism check)
77/77 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-endeavor-drain.json --summary
237/237 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-dragonbreath.json --summary
237/237 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-dragonbreath-projectiles.json --summary
61/61 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-endeavor.json --summary
192/192 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-doubleteam.json --summary
250/250 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-featherdance.json --summary
90/90 frames matched -> tools/compare/out/latest
```

`turn2-endeavor.json` matches its recorded count (77/77) both runs —
re-pinned live, this is the baseline the wiring step (§13.3) must preserve.
Every adjacent trace re-confirms its own already-established count
unchanged, proving this session's read-only recon (plus the new unwired
`turn2EndeavorPresentationStaging.ts` module) touched nothing live. `npm test`
**266 files, 3529 tests** (250/3417 at §12.4's own baseline + 3 from §12.5's
own landed wiring [252/3446] + 9 new from this session's own
`turn2EndeavorPresentationStaging.test.ts`, plus other worktree-independent
growth already folded in ahead of this session — re-counted live, not
copied from §12.4). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers, no
canonical recording import added).

### 13.5 Wiring landed, 2026-07-27 (main lane, bounded worker)

§13.3's plan executed steps 1/2/4 exactly as written; step 3
(`anchorOpponentAfterTurnHp`'s own steady overlay in `drawEndeavorSquish`,
`:6881`) left as the named out-of-this-step's-own-scope residual the plan
itself called it — Grovyle's own steady HP during the squish choreography,
not a drain endpoint of this window's own hit chain. Every §13.3 citation
(`battleScene.ts:6905`/`:6896`/`:6965`/`:6881`) was re-verified against this
worktree's own `HEAD` before editing and matched exactly — no design-doc
slip found this time.

`battleScene.ts` gained two module-level consts,
`TURN2_ENDEAVOR_ATTACK_LINE1`/`LINE2` and `TURN2_ENDEAVOR_HP`, resolved once
at module load from `turn2EndeavorPresentationStaging.ts`'s
`resolveTurn2EndeavorAttackLines()`/`resolveTurn2EndeavorHpEndpoints()` —
the same "resolve once at module load" shape `TURN5_ENDEAVOR_ATTACK_LINE1/2`/
`TURN5_ENDEAVOR_HP` already established for turn 5's own sibling call site.
`drawTurn2KickoffText`'s own ENDEAVOR-text branch (step 1, `:6905`) now draws
`TURN2_ENDEAVOR_ATTACK_LINE1/2` instead of the raw `TURN_KICKOFF_LINE1`/
`TURN2_KICKOFF_LINE2` literals; its own `endeavorOnixHp` call (step 2,
`:6896`) now sources `startHp`/`endHp` from `TURN2_ENDEAVOR_HP.from`/`.to`
instead of the direct `anchorPlayerBattler.hp`/`anchorPlayerAfterTurnHp`
reads. **Zero bridge edits** — the staging module already called the shared
`resolveRockSlidePresentationWindowContent` bridge function (its existing
`attackStringScriptLabel` override parameter), exactly as §13.2/the brief's
own out-of-scope note predicted; no rework was needed.

**No literal died.** `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`
(`battleMenu.ts:1086`/`:2635`) stay defined and in active use by turn 3's own
repeat-ENDEAVOR call site (`drawTurn3EndeavorText`, `battleScene.ts:6985`,
verified still reading the raw literals directly) and turn 1's own
`drawTurnKickoffText` — only `drawTurn2KickoffText`'s own one call site was
retired from reading them directly. `anchorPlayerBattler.hp`/
`anchorPlayerAfterTurnHp` themselves stay defined and in use elsewhere in
this file (turn 3's own `endeavorOnixHp` call, `drawTurnEndSettledMenu`,
`drawActionMenuIdleContent`'s default param, several healthbox-overlay call
sites) — only this window's own two reads were superseded.

**Acceptance, re-verified this session:** the full sweep run BEFORE this
change (on the pristine `HEAD`) matched every recorded count exactly —
`turn2-endeavor.json` 77/77, `turn2-endeavor-drain.json` 237/237,
`turn2-dragonbreath.json` 237/237, `turn2-dragonbreath-projectiles.json`
61/61, `turn3-endeavor.json` 192/192, `turn3-rockslide.json` 256/256,
`turn1-rockslide.json` 256/256, `turn5-rockslide.json` 256/256,
`turn4-doubleteam.json` 250/250, `turn6-featherdance.json` 90/90 — no
pre-existing drift. Re-run AFTER the change reproduced every one of those
counts byte-identically, including a second `turn2-endeavor.json` run for a
determinism check (77/77 twice). `npm test` **268 files, 3560 tests**
unchanged from this session's own start (no new test file — this step wires
already-tested staging-module exports into production code, adds no new
bridge surface to test). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers).

### 12.6 `turn6-statfall.json` wiring: step 3 landed, step 4 found to need disproportionate new surface, 2026-07-27 (main lane, bounded worker)

Executes §12.3 steps 3/4, unblocked by entry 520's extractor charmap fix
(129/365 templates corrected, `resolveBattleStringLines` output now
byte-identical to every already-committed literal, including this window's
own curly apostrophe). Every citation in the brief
(`turn6AtkFellTextStartTick(pressTick)=7659`, the trace's last captured tick
7684 rendering 26 chars into "ONIX's ATTACK harshly fell!", the
`battleScene.ts:9354-9361` pre-drift line range) was re-verified against this
worktree's own `HEAD` before editing — the live function sat at `:9115-9137`
pre-this-edit (`drawTurn6FeatherDanceKickoffText`'s own `atkFellStart` branch
at `:9131-9136`, its `TURN6_ATKFELL_LINE1`/`LINE2` call at `:9133`), the drift
itself just accumulated line growth from intervening sessions, no citation
was actually wrong. Post-edit (this session's own const-block insertion
shifting later code down 18 lines) the same function sits at `:9133-9155`,
its `atkFellStart` branch at `:9149-9154`, its now-retired-literal call site
at `:9151`.

**Step 3 (landed).** `battleScene.ts` gained a module-level const pair,
`TURN6_ATKFELL_KICKOFF_LINE1`/`LINE2`, resolved once at module load from
`turn6FeatherDancePresentationStaging.ts`'s already-staged, already-tested
`resolveTurn6AtkFellLines()` — the same "resolve once at module load" shape
`TURN6_FEATHERDANCE_KICKOFF_LINE1/2` (§12.5) and `TURN2_ENDEAVOR_ATTACK_LINE1/2`
(§13.5) already established. `drawTurn6FeatherDanceKickoffText`'s own
`atkFellStart` branch (`:9151`) now draws these instead of the raw
`TURN6_ATKFELL_LINE1`/`LINE2` literals. **Zero bridge edits** — step 1's
existing `resolveFeatherDanceKickoffPresentationWindowContent` bridge
function (entry 514/§12.5) already returned everything `resolveTurn6AtkFellLines()`
needed (`statFellMessage.messageId`, `statChange.from`/`.to`); no rework was
needed, and `tests/turn6FeatherDancePresentationStaging.test.ts`'s own
pre-existing equivalence assertion (`resolveTurn6AtkFellLines()` byte-identical
to `TURN6_ATKFELL_LINE1/2`, curly apostrophe included) passed unmodified,
confirming the charmap fix's own claim before this step ever touched
production code.

**No literal died.** `TURN6_ATKFELL_LINE1`/`LINE2` (`battleMenu.ts:1559-1560`)
stay defined and in active use by turn 7's and turn 8's own repeat-FEATHER_DANCE
call sites (`drawTurn7FeatherDanceKickoffText`'s own call at `:9397`,
`drawTurn8FeatherDanceKickoffText`'s own call at `:9586`, both verified live
via `grep` before and after editing) — only
`drawTurn6FeatherDanceKickoffText`'s own one call site (`:9151`) was retired
from reading them directly, exactly as scoped.

**Step 4 (found to need disproportionate new surface, not landed).** The
brief's own escape valve applies. `turn6StatFallEva`'s existence check (its
own tick-window gate, `d` in `[229,309]`) is real RAM-derived animation
timing with no kernel-event equivalent (semantic events carry no ticks) —
already established as NOT a kernel gap by §8.4 Option A, and this checkpoint
re-confirms that finding a sixth time for this exact function family; there
is no turn-local *boolean* here to replace; the WHEN is already the correct
shape. The WHAT — `drawTurn6StatFallBanner`'s hardcoded ONIX corner/tileset
and its wrapped `drawStatDecreaseBannerForBattler`'s hardcoded
`statAnimBanner.palettes.attack`/`tilemaps.decrease` selection — is already
exactly consistent with the kernel's real
`stat-stage-change{battler:0,stat:"attack",from:6,to:4}` (§12.2), so there is
no live decision branch left to redirect, only an assertable-but-unenforced
consistency. Making that consistency kernel-*driven* rather than
kernel-*consistent* runs into a real, concrete obstacle checked directly, not
assumed: `drawTurn6StatFallBanner` is a **shared** helper, called unchanged
by turn 7's and turn 8's own out-of-scope draw functions
(`battleScene.ts:9393` and `:9582` respectively) with the exact same
eva/pressTick shape. Threading a kernel-derived stat/direction
parameter through it would force one of two disproportionate moves: (a) add
a new parameter and edit turn 7/8's own call sites to pass it too (both
explicitly out of scope for this step), or (b) build a full
`"attack"|"defense"|"speed"|"special-attack"|"special-defense"|"accuracy"|"evasion"`
-to-`palettes`-key translation table (`stat-stage-change`'s own type,
`battleScriptEvents.ts:148`, uses hyphenated `special-attack`/`special-defense`;
`StatAnimBannerAsset`'s own palette keys, `:886`, use camelCase
`spAttack`/`spDefense` — a real naming mismatch, not just a lookup) to cover
six stat values this window will never produce, for a call site whose real
output this session's own regression sweep proves is already correct. Both
are exactly the "6-optional-parameter generalization for a single second
caller" shape this file's own established style explicitly avoids
(`drawStatsBanner`'s own doc, `:9107-9122`, choosing a plain copy over
threading new optional params through a shared function for one caller) —
new surface disproportionate to the one caller that would use it, per the
brief's own criterion for reporting over improvising. **Landing step 3 alone
as this step's committed rung**, per the brief's own instruction that this
finding is a success, not a failure.

**Acceptance, re-verified this session:** the full regression sweep run
BEFORE this change (on the pristine `HEAD`) matched every recorded count
exactly — `turn6-statfall.json` 127/127, `turn6-featherdance.json` 90/90,
`turn6-rockslide-a.json` 255/255, `turn6-feathers.json` 235/235,
`turn6-menu.json` 44/44, `turn1-rockslide.json` 256/256, `turn5-rockslide.json`
256/256, `turn4-doubleteam.json` 250/250, `turn2-endeavor.json` 77/77 — no
pre-existing drift. Re-run AFTER the change reproduced every one of those
counts byte-identically, including a second `turn6-statfall.json` run for a
determinism check (127/127 twice). `npm test` **268 files, 3560 tests**
unchanged from this session's own start (no new test file — this step wires
an already-tested staging-module export into production code, adds no new
bridge surface to test). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers).

## 14. Prep-scout for the NEXT window, 2026-07-27 (`turn11-featherdance.json`), side lane

Read-only recon plus one unwired staging module/test — the same §8-§13
contract (recon + staged proof + plan, **no production wiring**). This
session touches no `battleScene.ts`, `presentationEventWindowBridge.ts`, or
`battleStringResolver.ts`. All line numbers below are re-verified against
this worktree's own `HEAD` (`0122a0c`, the commit recording §12.6's landed
step-3 wiring).

### Candidate confirmation (not a full re-weigh)

`git log --oneline bbd6e23..HEAD -- src/engine/battleScene.ts
src/engine/presentationEventWindowBridge.ts src/engine/battleStringResolver.ts`
shows exactly two production commits since §13's own weighing (`d6957b4`
turn2-endeavor §13.3, `0122a0c` turn6-statfall §12.3 step 3) — both already
folded into §13's/§12.6's own text, neither touches `drawTurn7Feather
DanceKickoffText`/`drawTurn8FeatherDanceKickoffText`/`drawTurn9QuickAttack
Window`/`drawTurn13SandAttackWindow`. So §13's own candidates table still
holds verdict-for-verdict except the one row the brief flagged: **`turn11-
featherdance.json`'s apostrophe blocker is resolved.** Re-verified directly,
not assumed: `TURN11_ATKFLOOR_LINE1`/`LINE2` (`battleScene.ts:11280-11281`)
still read `"ONIX’s ATTACK"`/`"won’t go lower!"` (curly U+2019), and this
session's own staged run below (§14.2) resolves
`STRINGID_STATSWONTDECREASE`'s real template through the UNMODIFIED shared
`resolveBattleStringLines` to those exact same byte sequences — entry 520's
charmap fix (commit `00a0e16`/`7330a5b`, landed before this worktree's own
history begins) already covers this template, the same way §12.6 found for
`STRINGID_DEFENDERSSTATFELL`. `turn7-feathers.json`/`turn8-feathers.json`
are still hollow for this checkpoint's own purposes (zero new content in
their own captured ranges, §13's own verdict, unchanged — re-confirmed live
by re-reading `docs/turn7-notes.md`/`docs/turn8-notes.md`'s own cited
ranges, no new commits touched them). `turn9-quickattack.json`/`-b.json` are
still animation-residual-heavy (`docs/battle-turn-notes.md` §36-§41's own
still-open pixel gaps, untouched this session). `turn13-sandattack.json` is
still bigger (190 frames vs. this window's 178) **and** still needs a
genuinely new bridge shape (opponent-target ACCURACY-stat-down instead of
ATK — confirmed by a fresh read of `drawTurn13SandAttackWindow`,
`battleScene.ts:12065+`, unchanged since §13). **Verdict: §13's own pick
order stands, and `turn11-featherdance.json` — the row §13 itself flagged
as "worse-blocked... and bigger" purely because of the apostrophe — is now
the smallest genuinely-new, unblocked candidate.** This session's own §14
covers exactly that window, per the brief.

### 14.1 Every input `turn11-featherdance.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing chain**, `drawTurn11FightSubmenuWindow`
(`battleScene.ts:11470-11493`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `sm.openElapsed === null` | `:11471-11474` | false — the FIGHT submenu is already open (turn 11's own real press already landed) |
| `t < revealTick` (`TICK0+sm.openElapsed+FIGHT_SUBMENU_OPEN_DELAY`) | `:11475-11479` | false — past the submenu's own open-animation window |
| `sm.confirmElapsed !== null` | `:11480` | true — turn 11's own real A-confirm press already landed, `pressTick = TICK0 + sm.confirmElapsed` |
| `t >= turn6FeatherDanceTextStartTick(pressTick)` | `:11482-11486` | true for this trace's own capture range — **the one condition that actually selects** `drawTurn11FeatherDanceWindow(fb, t, pressTick)` (`:11484`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class every prior window's own dispatch chain already established |

**`drawTurn11FeatherDanceWindow`'s own body** (`battleScene.ts:11441-11455`):

| input | line(s) | condition / role in THIS window |
| --- | --- | --- |
| `t >= rockSlideTextStartTick(TURN11_ROCKSLIDE_PRESS_TICK)` | `:11442-11445` | false for this trace's entire capture range (13352-13529, ROCK_SLIDE's own kickoff starts at 13530, §5) — the ROCK_SLIDE half is a SEPARATE, already-reused mechanism (`drawTurn11RockSlideWindow`, `:11407-11425`, identical to turns 6/7/9/10's own instances), genuinely out of THIS window's own scope |
| `bounceTick = turn11KickoffBounceTick(t, pressTick)` / `drawTurn11FieldBase(fb, t, bounceTick)` | `:11446-11447`, formulas at `:11254-11263` | presentation-native idle-bounce regime bookkeeping (this turn's own regime-6 anchor), no kernel-content mapping, same "own regime, own shift constant" class every prior turn's equivalent wrapper already establishes |
| `atkFloorStart = turn11AtkFloorTextStartTick(pressTick)` = `pressTick + TURN11_ATKFLOOR_TEXT_START_DELAY`(83, `:11283-11286`) | `:11449-11450` | **true** once reached — the ONE new dispatch branch this window adds (§10's own "genuinely new" class, not a parameterization) |
| `TURN11_ATKFLOOR_LINE1`/`LINE2` ("ONIX’s ATTACK"/"won’t go lower!", `:11280-11281`) via `turn11AtkFloorTextVisibleChars(t, pressTick)` (`:11287-11291`, `min(TOTAL, t-start+1)`, no extra lag) | `:11451` | the ONE genuinely new content this trace's own captured frames render (tick 13449-13529 hold, `docs/turn11-notes.md` §5) |
| else: `TURN6_FEATHERDANCE_LINE1`/`LINE2` ("Foe PIDGEOTTO used"/"FEATHERDANCE!", `battleScene.ts:9040-9041`) via `turn6FeatherDanceTextVisibleChars(t, pressTick)` (`:9044-9053`) | `:11452-11454` | **pure reuse, unchanged since turn 6** — the kickoff-text half of this window (tick 13352-13421 typing+hold, `docs/turn11-notes.md` §5), byte-identical mechanism to turns 6/7/8's own kickoff text, not this window's own new fact |

**RAM-dump / HP-constant reads** — this window has NONE (unlike turn 2's
own ENDEAVOR or turn 6's own stat-fall banner): FEATHER_DANCE deals no
damage, so no `anchorPlayerBattler.hp`-style read or drain-interpolation
call exists anywhere in `drawTurn11FeatherDanceWindow`'s own body — Onix's
HP (14) and Pidgeotto's HP (38, this window's own attacker, unchanged by
its own move) are both handled entirely by `drawTurn11FieldBase`'s own
static defaults (`TURN10_ONIX_AFTER_AERIALACE_HP`, `:11254`), no fresh read
needed for THIS window.

**Hidden-state finding this brief's own §11/§12/§13 precedent asks to
flag:** Onix's own ATK stat stage (**0**, floored since turn 8, per
`docs/turn11-notes.md` §4: "0 → 0 (unchanged — FEATHER_DANCE's own attempt
is blocked by the floor, 4th turn running at 0)") is **never read as a
number anywhere in `battleScene.ts`** — re-confirmed live this session
(`grep -n "statStage" src/engine/battleScene.ts` returns zero hits). Which
literal branch renders (`TURN11_ATKFLOOR_LINE1/2` vs. a hypothetical
ordinary stat-drop message) is a fixed dispatch fact baked into this
specific trace's own hand-authored tick table
(`turn11AtkFloorTextStartTick`), not derived from any live stat-stage
value — same "no plausible mapping today, only a kernel-provable
consistency" class every prior window's own hidden-state finding already
established.

**Tick anchors** (all `pressTick`-relative offsets): `turn6FeatherDance
TextStartTick` (reused, `:9044-9047`), `TURN11_ATKFLOOR_TEXT_START_DELAY`=83
(`:11283`, render 13422 − FEATHER_PRESS_TICK(13339)), `TURN11_ROCKSLIDE_
PRESS_TICK`=13137 (`:11305`, the ROCK_SLIDE half's own anchor, out of this
window's own scope) — all presentation-native, same "not a kernel gap"
finding §8.4's Option A already established, re-confirmed here an eighth
time.

### 14.2 Staged proof: what the kernel emits today for this window's own content

EFFECT_ATTACK_DOWN_2 has been executable since before this session (§12.2's
own registration, already exercised by `turn6FeatherDancePresentationStaging.ts`)
— no opcode-registration research needed, only a real repeat hit chain at
turn 11's own real state: Onix's ATK stage ALREADY AT THE FLOOR (0) entering
the move, unlike turn 6's own genuine first-drop (6→4).
`src/engine/turn11FeatherDancePresentationStaging.ts` (new, **unwired** —
not imported by `battleScene.ts` or any production file, adds no new
`presentationEventWindowBridge.ts` function either) mirrors `turn6Feather
DancePresentationStaging.ts`'s pattern, parameterized for turn 11's own real
snapshot: real Onix/Pidgeotto level-50 stats (unchanged since turn 6,
`docs/turn6-notes.md` §4), real MOVE_FEATHER_DANCE (id 297), Pidgeotto
(side 1) attacking Onix (side 0), Onix's own ATK stage entering at **0**
(the floor) instead of turn 6's neutral 6, both read fresh this session from
`docs/turn11-notes.md` §4's own RAM-confirmed snapshot table (HP 14/38, PP
2/10 ROCK_SLIDE and 12/15 FEATHER_DANCE entering).

**The RNG seed is turn 11's own real recorded value, identified (not
derived by inversion like turn 6's own module needed) from `docs/turn11-
notes.md` §3's own already-RAM-probed ledger**: `gRngValue` is flat at
`1753916210` entering turn 11 (zero navigation-press rolls, the fourth turn
running confirming that rule, §3), and the ledger's FIRST entry (tick
13350, 1 step, value after `2876053693`) is Pidgeotto's own FEATHER_DANCE
accuracy roll — so the SEED entering that roll is simply the turn's own
entering value, no LCG inversion needed this time. **Verified live this
session, not guessed**: `advanceRngValue(1753916210)` (`src/engine/rng.ts`'s
own `BigInt`-based LCG step, NOT plain `Number` arithmetic) equals EXACTLY
the ledger's own recorded `2876053693` —
`tests/turn11FeatherDancePresentationStaging.test.ts`'s own dedicated
assertion, 9 further assertions on the staged run itself. The real staged
event dump (`vite-node`, this session, not hand-derived):

```
atkStageAfter: 0   (0 -> 0, byte-identical to docs/turn11-notes.md §4's own
                     RAM-confirmed "4th turn running at 0" finding)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE"}                sourceLabel: BattleScript_EffectStatDown       (battle_scripts_1.s:538)
  set-battler-pp-data           {battler:1, movePosition:2, pp:11}              sourceLabel: BattleScript_EffectStatDown       (:539, 12 -> 11)
  stat-stage-change             {battler:0, stat:"attack", from:0, to:0}        sourceLabel: BattleScript_EffectStatDown       (:540)
  message                       {messageId:"STRINGID_STATSWONTDECREASE"}       sourceLabel: BattleScript_StatDownPrintString  (:551)
  set-battler-sprite-visibility {battler:1, invisible:false}                   (moveend pass-through)
  set-battler-sprite-visibility {battler:0, invisible:false}                   (moveend pass-through)
```

**The genuinely new shape, source-derived not assumed**:
`changeStatBuffs`'s own message-selection arithmetic
(`battleScriptStatBuffs.ts:274-303`) computes `multistringChooser =
(before === MIN_STAT_STAGE) ? B_MSG_STAT_WONT_CHANGE : isAttackerActive`;
with `before` already 0, this picks `B_MSG_STAT_WONT_CHANGE` (2,
`battle_string_ids.h:405`), which selects `gStatDownStringIds[2]` =
`STRINGID_STATSWONTDECREASE` (`battle_message.c:1020`), **not**
`STRINGID_DEFENDERSSTATFELL`/`STRINGID_ATTACKERSSTATFELL` — confirmed live
by this module's own test, not merely reasoned about statically. The REAL
committed script's own shared tail
(`reference/pokeemerald/data/battle_scripts_1.s:541-544`,
`BattleScript_EffectStatDown`'s own `jumpifbyte CMP_LESS_THAN,
cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_DECREASE, BattleScript_StatDownDoAnim`)
means multistringChooser==2 does **not** take the `BattleScript_
StatDownDoAnim` branch (`:545-549`) at all — `attackanimation` (the
move-use particle effect) and `playanimation ...STATS_CHANGE` (the
swirl/banner effect) are BOTH skipped, falling straight through to
`pause`+`goto BattleScript_StatDownPrintString` (`:543-544`). **This is the
kernel-level confirmation of `docs/turn11-notes.md` §5's own PNG-derived
finding** ("the 33-tick hold here vs ~290-tick holds in turns 6-8 is the
signature... the blocked stat change short-circuits the battle script
BEFORE its animation step") and the RAM-derived "0 feather-template OAM
hits" finding (§2 addendum) — proven here as **ZERO `animation`-kind events
anywhere in this staged run's own event stream** (turn 6's own WORKED case,
by contrast, emits `MOVE_ANIMATION` + `STATS_CHANGE`, §12.2) —
`tests/turn11FeatherDancePresentationStaging.test.ts`'s own dedicated
assertion, not merely inferred from pixels/OAM.

**Zero new bridge shape needed — a genuine finding, not an assumption.**
`BattleScript_StatDownPrintString` (`:550-552`) is the SAME shared label
turn 6's own module's `statFellMessage` already sits under — the existing
`presentationEventWindowBridge.ts`'s `resolveFeatherDanceKickoffPresentation
WindowContent` (built for turn 6's own DIFFERENT, WORKED branch, §12.3
step 1) requires exactly three signals: a `message` under
`BattleScript_EffectStatDown`, a same-labeled `stat-stage-change`, and a
`BattleScript_StatDownPrintString`-labeled message — **all three are
present in THIS floored run too**, just with `from===to===0` and
`STRINGID_STATSWONTDECREASE` instead of `STRINGID_DEFENDERSSTATFELL`. Called
unchanged against this staged run's own event list (`resolveTurn11Feather
DanceWindowContent`, this module), it resolves correctly — verified live,
not merely argued from the label match.

**Resolver byte-identity, verified (the turn6 precedent test shape,
`tests/turn6FeatherDancePresentationStaging.test.ts`'s own equivalence
assertion)**: `resolveTurn11AtkFloorLines()` resolves
`STRINGID_STATSWONTDECREASE`'s real template (`src/data/gen/battle-message-
templates.json` id 62, `"{B_DEF_NAME_WITH_PREFIX}’s {B_BUFF1}\nwon’t go
lower!"`, curly apostrophes already present post-entry-520) through the
UNMODIFIED shared `resolveBattleStringLines` to `["ONIX’s ATTACK", "won’t
go lower!"]` — byte-identical to `TURN11_ATKFLOOR_LINE1`/`LINE2`
(`battleScene.ts:11280-11281`), asserted directly by this module's own test.
No `B_BUFF2` placeholder in this template (unlike `STRINGID_DEFENDERSSTATFELL`'s
own magnitude-dependent "harshly fell!"/"fell!" tail) — the fixed "won't go
lower!" text is a plain literal segment, needing no `statFellBuff2`-style
derivation.

**Named gaps, current as of this staged run** (§12.2/§13.2 format):

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `sm.openElapsed`/`revealTick`/`sm.confirmElapsed`/`turn6FeatherDanceTextStartTick` dispatch chain (§14.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found |
| `TURN6_FEATHERDANCE_LINE1`/`LINE2` ("Foe PIDGEOTTO used\nFEATHERDANCE!", reused unchanged) | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, re-derived from a real run of THIS turn's own script** — byte-identical to turn 6/7/8's own already-wired/staged kickoff text, same attacker/move |
| Onix's own ATK stat stage, 0 → 0 (never read anywhere in `battleScene.ts`, §14.1's own hidden-state finding) | `stat-stage-change{battler:0, stat:"attack", from:0, to:0}` | **emitted today, proven this session** — the real production emission site (`battleScriptStatBuffs.ts:274-303`) is reachable end-to-end from FEATHER_DANCE's own real script entry with turn 11's own real floored stage |
| `TURN11_ATKFLOOR_LINE1`/`LINE2` ("ONIX’s ATTACK\nwon’t go lower!") | `message{messageId:"STRINGID_STATSWONTDECREASE"}` | **fully proven, byte-identical resolve** — the KNOWN PREREQUISITE glyph residual §13 flagged is confirmed resolved (entry 520), unlike §12.3 step 3's own then-still-open state for the sibling `STRINGID_DEFENDERSSTATFELL` template |
| feather-sprite/STATS_CHANGE-swirl animation choreography (RAM-confirmed absent, `docs/turn11-notes.md` §2 addendum/§5) | **no `animation`-kind event at all** in this stream | **absence proven, not just assumed** — `BattleScript_StatDownDoAnim`'s own branch is structurally unreached when floored, confirmed by this staged run's own empty animation-event set |
| PP readout (Pidgeotto's own FEATHER_DANCE, 2nd use, 12→11) | `set-battler-pp-data{battler:1, movePosition:2, pp:11}` | **emitted today, proven this run**, independently RAM-confirmed (`docs/turn11-notes.md` §4) |
| ONIX/PIDGEOTTO HP (14/38) | no `hp-change` events anywhere in this stream | **no kernel event needed** — FEATHER_DANCE deals no damage, same "steady-state read" finding every prior sibling module already made |
| `turn11KickoffBounceTick`/`drawTurn11FieldBase` regime bookkeeping, `TURN11_ROCKSLIDE_PRESS_TICK` (ROCK_SLIDE half, out of scope) | n/a — presentation-only timing / a separate mechanism | not applicable to this window, same class as every prior window's own non-content tick anchors |

**What this staged run does and does not prove:** it proves the real
FEATHER_DANCE opponent-target chain reproduces turn 11's OWN specific
floored transition (0→0, the real 4th-turn-running repeat) and that the
resulting `stat-stage-change`/`STRINGID_STATSWONTDECREASE` pair — WITHOUT
any animation event — is genuinely reachable end-to-end through the real
script, using turn 11's OWN real RNG seed. It also proves
`presentationEventWindowBridge.ts` needs **zero** new bridge shape (unlike
turn 6's own module, which had to name a genuinely new two-`sourceLabel`
bridge before it existed) — the bridge built for turn 6's WORKED branch
already generalizes to this floored branch, because both branches funnel
through the SAME `BattleScript_StatDownPrintString` tail label regardless of
which `gStatDownStringIds` entry gets printed. It does NOT re-derive the
kickoff-text mechanism (turn 6/7/8's own already-established, reused here
verbatim) or the ROCK_SLIDE half (a separate, already-wired-elsewhere
mechanism family, out of this module's own scope).

### 14.3 Ordered wiring plan (acceptance: `turn11-featherdance.json` still passes at 178/178, regression sweep over the adjacent turn-11 family plus the checkpoint's own standing acceptance bar unchanged)

This window's own new text (`TURN11_ATKFLOOR_LINE1/2`) has the SAME
apostrophe-bearing shape `TURN6_ATKFELL_LINE1/2` needed — but unlike that
window, the prerequisite is **already satisfied** (entry 520, re-confirmed
§14.2's own byte-identity assertion), so nothing blocks this plan.

1. Wire `drawTurn11FeatherDanceWindow`'s ATK-floor branch
   (`battleScene.ts:11451`) to source its two message lines from
   `turn11FeatherDancePresentationStaging.ts`'s `resolveTurn11AtkFloorLines()`
   instead of the raw `TURN11_ATKFLOOR_LINE1`/`LINE2` literals — byte-
   identical content, mechanical swap (§12.3/§13.3's own precedent shape),
   same "resolve once at module load" pattern (`TURN11_ATKFLOOR_KICKOFF_
   LINE1`/`LINE2`-style consts) every sibling wiring step established.
   `TURN11_ATKFLOOR_LINE1`/`LINE2` themselves have no other call site today
   (`grep -n "TURN11_ATKFLOOR_LINE" src/engine/battleScene.ts` finds only
   this one definition + this one use) — this step retires their only
   direct read, but the constants can stay defined (harmless) or be
   inlined into the new resolved consts, whichever the wiring worker's own
   established convention (§12.5/§13.5) prefers.
2. Do **NOT** touch `drawTurn11FeatherDanceWindow`'s own kickoff-text
   branch (`:11453`, `TURN6_FEATHERDANCE_LINE1/2` via
   `turn6FeatherDanceTextVisibleChars`) — that literal call site is shared
   verbatim by turns 6/7/8's own kickoff text and is this checkpoint's own
   already-established reuse, not a fresh fact THIS step proves; wiring it
   (if ever done) is turn 6's own already-landed `TURN6_FEATHERDANCE_
   KICKOFF_LINE1/2` constant (§12.5), already resolved from the kernel —
   turn 11's own call site could point at that SAME already-resolved
   constant in a follow-up, but that is a separate, smaller step from this
   plan's own scope (this plan only closes the ATK-floor text gap named as
   this window's own ONE new fact, per §10's "parameterization, not a
   rebuild" discipline).
3. The ROCK_SLIDE half (`drawTurn11RockSlideWindow`, `:11407-11425`,
   reached once `t >= rockSlideTextStartTick(TURN11_ROCKSLIDE_PRESS_TICK)`)
   stays completely untouched — a separate, already-reused mechanism
   family (turns 6/7/9/10's own instances), out of this step's own scope,
   same "narrow to what's actually unblocked" discipline every prior
   window's own plan used for its adjacent out-of-scope reads.
4. Re-run `npm run compare -- turn11-featherdance.json` and confirm it
   still matches at **178/178** (recorded count) before/after, PLUS a
   regression sweep of `turn11-menu.json` (56/56, this turn's own pre-open/
   confirm-press-transient sibling — most likely to catch a step-1
   regression bleeding backward into the pre-floor-text plateau),
   `turn11-rockslide.json` (163/163, this turn's own ROCK_SLIDE-half
   sibling — most likely to catch a step-1 regression bleeding forward past
   the handoff), `turn6-featherdance.json` (90/90, the kickoff-text literal's
   OTHER live call site, step 2's own explicit no-touch target),
   `turn6-statfall.json` (127/127, `TURN6_ATKFELL_LINE1/2`'s own now-wired
   call site — the closest sibling to this plan's own step 1 shape),
   `turn2-endeavor.json` (77/77), `turn3-rockslide.json` (256/256),
   `turn1-rockslide.json` (256/256), `turn5-rockslide.json` (256/256), and
   `turn4-doubleteam.json` (250/250) — the checkpoint's own established
   acceptance bar, matching the exact live counts §14.4 already re-pinned
   this session.

**No literal should die in this step.** `TURN6_FEATHERDANCE_LINE1`/`LINE2`
(`battleScene.ts:9040-9041`) stay defined and in active use by turns 6/7/8's
own kickoff-text call sites AND by this window's own kickoff branch
(step 2's own explicit no-touch); only `drawTurn11FeatherDanceWindow`'s own
ATK-floor branch (`:11451`) is retired from reading `TURN11_ATKFLOOR_LINE1/2`
directly.

### 14.4 Comparator re-pin

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, against this lane's
Battle Scene OFF oracle (`127.0.0.1:8014`):

```
$ npm run compare -- turn11-featherdance.json --summary   (run 1)
178/178 frames matched -> tools/compare/out/latest

$ npm run compare -- turn11-featherdance.json --summary   (run 2, determinism check)
178/178 frames matched -> tools/compare/out/latest

$ npm run compare -- turn11-menu.json --summary
56/56 frames matched -> tools/compare/out/latest

$ npm run compare -- turn11-rockslide.json --summary
163/163 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-featherdance.json --summary
90/90 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-statfall.json --summary
127/127 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-endeavor.json --summary
77/77 frames matched -> tools/compare/out/latest

$ npm run compare -- turn3-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn1-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn5-rockslide.json --summary
256/256 frames matched -> tools/compare/out/latest

$ npm run compare -- turn4-doubleteam.json --summary
250/250 frames matched -> tools/compare/out/latest
```

`turn11-featherdance.json` matches its recorded count (178/178) both runs —
re-pinned live, this is the baseline the wiring step (§14.3) must preserve.
Every adjacent trace re-confirms its own already-established count
unchanged, proving this session's read-only recon (plus the new unwired
`turn11FeatherDancePresentationStaging.ts` module) touched nothing live.
`npm test` **269 files, 3570 tests** (268/3560 at §12.6's own baseline + 1
new file/10 new tests from this session's own
`turn11FeatherDancePresentationStaging.test.ts`). `npm run build` clean.
`executableFrontierRatchet.test.ts` unmoved (6/6, zero new barriers, no
canonical recording import added).

## 15. Prep-scout for the NEXT window, 2026-07-27 (`turn13-sandattack.json`), side lane

Read-only recon plus one unwired staging module/test — the same §8-§14
contract (recon + staged proof + plan, **no production wiring**). This
session touches no `battleScene.ts`, `presentationEventWindowBridge.ts`, or
`battleStringResolver.ts`. All line numbers below are re-verified against
this worktree's own `HEAD` (`08073dc`).

### Candidate confirmation (not a full re-weigh)

`git log --oneline 23d998a..HEAD -- src/engine/battleScene.ts
src/engine/presentationEventWindowBridge.ts src/engine/battleStringResolver.ts`
(`23d998a` = §14's own docs commit) returns **empty** — zero production
commits touched any of the three files since §14 weighed its own
candidates table (§13's table, re-cited by §14). So every row's own verdict
stands unchanged, re-verified cheaply (not re-argued) this session:
`drawTurn7FeatherDanceKickoffText`/`drawTurn8FeatherDanceKickoffText`
(`battleScene.ts:9384`/`:9573`) still exist unchanged and `turn7-feathers
.json`/`turn8-feathers.json` still capture exactly 145/162 frames (byte-
identical to §13's own citation) — still hollow for a staging deliverable,
their own captured ranges rendering byte-identical already-resolved
kickoff text, nothing new to stage. `drawTurn9QuickAttackWindow`
(`:10378`) still exists unchanged and `turn9-quickattack.json`/`-b.json`
still capture 169/77 frames — still animation-residual-heavy
(`docs/battle-turn-notes.md` §36-§41's own still-open pixel gaps,
untouched by any commit since §13/§14). `turn12-rockslide-miss.json` still
captures exactly 38 frames, still sparse across a 749-tick span spanning
four-plus already-distinct functions (kickoff text, ROCK_SLIDE attack, the
miss message, the resettled turn-13 menu) — still not a single bounded
leaf, same "multi-dispatcher" rejection §12/§13 already gave, re-verified
by the same frame count. `turn11-featherdance.json` is §14's own pick,
already covered by this dossier's own §14 deliverable (not re-litigated
here; per this brief's own framing it is "consumed" — a main-lane wiring
step, not yet landed as of this commit, but already fully staged/proved/
planned, so this session moves one step further down the cadence rather
than re-covering it).

**Verdict: `turn13-sandattack.json` is confirmed the correct next pick.**
It is the smallest remaining candidate that is BOTH unblocked (no
apostrophe/glyph prerequisite — its own kickoff text, "Foe PIDGEOTTO
used"/"SAND-ATTACK!", `battleScene.ts:11813-11814`, has none) AND
genuinely new (an opponent-target ACCURACY-stat-down, a `stat` value this
dossier's staged proofs have never exercised before — §13's own table
entry, re-cited verbatim: "a genuinely NEW bridge shape... a target-
accuracy banner mechanism this dossier hasn't staged before"). Whether
that table entry's own *speculative* framing ("genuinely NEW bridge
shape") survives contact with a real staged run is exactly what §15.2
below answers from evidence, not from the table's own prior guess.

### 15.1 Every input `turn13-sandattack.json` consumes today (re-verified against `HEAD`)

**Dispatch-routing chain**, `drawFightSubmenuWindow` (`battleScene.ts:5658+`):

| input | line(s) | condition to REACH this window |
| --- | --- | --- |
| `turn14Resolved` | `:5678-5686` | false — routes to turn 15's own dispatcher otherwise |
| `turn13Resolved` | `:5687-5693` | false — routes to turn 14's own dispatcher otherwise |
| `turn12Resolved` | `:5694-5703` | **true** — the one condition that actually selects `drawTurn13FightSubmenuWindow(fb, t, sm, turn13KoDismissTick)` (`:5701`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class every prior window's own dispatch chain already established |

**`drawTurn13FightSubmenuWindow`'s own body** (`battleScene.ts:11761-11794`):

| input | line(s) | condition / role in THIS window |
| --- | --- | --- |
| `sm.openElapsed === null` | `:11762-11765` | false — the FIGHT submenu is already open (turn 13's own real press already landed) |
| `t < revealTick` (`TICK0+sm.openElapsed+FIGHT_SUBMENU_OPEN_DELAY`) | `:11766-11780` | false — past the submenu's own open-animation window (this branch's own comment documents a real per-turn residue: this regime needs an UNSHIFTED raw `t`, a -2-tick difference from turn 12's own analogous branch, oracle-pixel-bisected, presentation-native, not a kernel fact) |
| `sm.confirmElapsed !== null` | `:11781` | true — turn 13's own real A-confirm press already landed, `pressTick = TICK0 + sm.confirmElapsed` (=15419 at runtime, `docs/turn13-notes.md` §3) |
| `t >= turn13SandAttackTextStartTick(pressTick)` | `:11782-11787` | true for this trace's own capture range — **the one condition that actually selects** `drawTurn13SandAttackWindow(fb, t, pressTick, koDismissTick)` (`:11785`); every check above it is a false/pass-through gate, same "scheduler/PC state, no content mapping" class every prior window's own dispatch chain already established |

**`drawTurn13SandAttackWindow`'s own body** (`battleScene.ts:12065-12082`):

| input | line(s) | condition / role in THIS window |
| --- | --- | --- |
| `t >= dragonBreathTextStartTick(TURN13_DRAGONBREATH_PRESS_TICK)` | `:12066-12069` | false for this trace's entire capture range (15420-15650; `TURN13_DRAGONBREATH_PRESS_TICK`=15516, `dragonBreathTextStartTick` adds +192=15708, `:12107`) — the DRAGON_BREATH half (Onix's own later move, a separate hit chain, `drawTurn13DragonBreathWindow`, `:12134+`) is never reached by this trace at all, genuinely out of scope |
| `frozenBounceTick = turn13KickoffBounceTick(t, pressTick)` / `drawTurn13FieldBase(fb, t, frozenBounceTick, undefined, undefined, 0, false, turn13SandAttackPidgeottoX2(t, pressTick))` | `:12070-12071`, formula `:11741-11744` | presentation-native frozen-bounce-phase + attacker-slide bookkeeping (`turn13SandAttackPidgeottoX2`, `:11934-11941`, a RAM-exact 7-entry pinned table, `pressTick+56..+62`) — no kernel-content mapping, same "own regime, own shift constant" class every prior turn's equivalent wrapper already establishes |
| `drawTurn13SandAttackDirt(fb, t, pressTick)` | `:12072`, body `:12021-12035` | the 30-sprite dirt-cloud closed form (`TURN13_SANDATTACK_DIRT_TABLE`, `:11977-12014`, RAM-exact linear-translation table) — pure sprite-motion presentation, no kernel-content mapping (this window's own `captureFrames` already excludes the small residual-OAM-order span, `docs/turn13-notes.md`'s own "excluded, not faked" finding, unchanged) |
| `accEva = turn13SandAttackAccEva(t, pressTick)` / `drawTurn13SandAttackAccBanner(fb, t, pressTick, accEva)` | `:12074-12075`, formulas `:11844-11894` | the accuracy-drop stat-change banner (BG1 scroll + alpha blend, `accuracy` palette/`decrease` tilemap) — **presentation timing/graphic only**; the banner's own EXISTENCE and DIRECTION (decrease) are hardcoded module constants today (`TURN13_SANDATTACK_ACC_TARGET_BLEND`=10, `TURN13_SANDATTACK_ACC_BG1_X`=64), not derived from any kernel event — §15.2 below proves the kernel DOES emit the same fact (`stat-stage-change{stat:"accuracy", from:6, to:5}`) this hardcoded schedule silently assumes |
| `t >= accFellStart` (`turn13AccFellTextStartTick(pressTick)`) → `drawMessageTextLines(fb, TURN13_ACCFELL_LINE1, TURN13_ACCFELL_LINE2, ...)` | `:12076-12080`, literals `:11907-11918` | the genuinely new content class this window adds: "ONIX’s accuracy" / "fell!" (curly apostrophe, already-resolved glyph per entry 520 — same charmap fix §14's own candidate confirmation already re-verified, no new prerequisite) |
| else: `drawMessageTextLines(fb, TURN13_SANDATTACK_LINE1, TURN13_SANDATTACK_LINE2, ...)` | `:12081`, literals `:11813-11814` | the kickoff text ("Foe PIDGEOTTO used"/"SAND-ATTACK!", no apostrophe) — mechanically the SAME `STRINGID_USEDMOVE` shape every sibling module's own kickoff line already resolves, just a new move/species pairing |

**RAM-dump / HP-constant reads** — this window has NONE (unlike turn 2's
own ENDEAVOR): SAND_ATTACK deals no damage, so no `anchorPlayerBattler.hp`-
style read or drain-interpolation call exists anywhere in
`drawTurn13SandAttackWindow`'s own body — both mons' HP (Onix 4, Pidgeotto
16) are handled entirely by `drawTurn13FieldBase`'s own static defaults
(`onixHp: number = TURN12_ONIX_AFTER_AERIALACE_HP`, `pidgeottoHp: number =
TURN11_PIDGEOTTO_AFTER_ROCKSLIDE_HP`, `:11723`), no fresh read needed for
THIS window.

**Hidden-state finding this brief's own §11-§14 precedent asks to flag:**
Onix's own accuracy stat stage (6, neutral, about to drop to 5 per
`docs/turn13-notes.md` §3/§4(d)) is **never read as a number anywhere in
`battleScene.ts`** — re-confirmed live this session (`grep -n "statStage"
src/engine/battleScene.ts` returns zero hits, same as §14's own finding).
Which literal branch renders (the accuracy-drop banner + "fell!" text vs. a
hypothetical floored "won't go lower!" branch) is a fixed dispatch fact
baked into this specific trace's own hand-authored tick table
(`turn13AccFellTextStartTick`), not derived from any live stat-stage value
— same "no plausible mapping today, only a kernel-provable consistency"
class every prior window's own hidden-state finding already established.
A SECOND hidden fact, specific to this window: the dirt-throw sprites'
per-call `(0,0)/(10,10)/(-10,-10)/(20,5)/(-20,-5)` script-authored offset
arguments are dead — `AnimDirtScatter` never reads them
(`docs/turn13-notes.md`'s own "(a)" finding, re-confirmed unchanged this
session by re-reading `battle_anim_ground.c`) — a genuine source quirk, not
a bug in this port, already correctly modeled by `TURN13_SANDATTACK_DIRT_
TABLE`'s own RAM-exact (not script-derived) per-sprite table.

**Tick anchors** (all `pressTick`-relative offsets, `pressTick`=15419 at
runtime): `turn13SandAttackTextStartTick`=+13 (`:11816-11819`),
`TURN13_SANDATTACK_ACC_RAMP_START_DELAY`=+118/`_HOLD_END_DELAY`=+157/
`_RAMPDOWN_ANCHOR_DELAY`=+158 (`:11845-11847`), `turn13AccFellTextStartTick`
=+189 (`:11910-11913`), `TURN13_SANDATTACK_SLIDE_START_OFFSET`=+56
(`:11934`), `TURN13_SANDATTACK_DIRT_WAVE_ANCHOR_OFFSET`=+61 (`:11964`),
`TURN13_DRAGONBREATH_PRESS_TICK`=15516 (a synthetic anchor, `:12107`, out
of this window's own scope) — all presentation-native, same "not a kernel
gap" finding §8.4's Option A already established, re-confirmed here a
ninth time.

### 15.2 Staged proof: what the kernel emits today for this window's own content

EFFECT_ACCURACY_DOWN's own dispatch-table entry point,
`BattleScript_EffectAccuracyDown` (`reference/pokeemerald/data/
battle_scripts_1.s:528-530`: `setstatchanger STAT_ACC, 1, TRUE` then `goto
BattleScript_EffectStatDown`), is confirmed present in the compiled
`battle-script-program.json`'s own `blocks` array (inspected directly this
session: `{"label": "BattleScript_EffectAccuracyDown", "line": 528, ...}`),
and its own `setstatchanger` operand triad compiles to the setbyte literal
`"STAT_ACC | 1 << 4 | TRUE << 7"` — **already** a registered constant in
`battleScriptSetByte.ts:190` (`6 | (1 << 4) | (1 << 7)`), confirmed by
inspecting that file directly. **Zero new opcode registration needed** —
the exact literal SAND_ATTACK's own script emits was already wired for
some other stat-down move before this session, same "opcode-registration
already done" finding class §14.2 established for EFFECT_ATTACK_DOWN_2.

`src/engine/turn13SandAttackPresentationStaging.ts` (new, **unwired** —
not imported by `battleScene.ts` or any production file, adds no new
`presentationEventWindowBridge.ts` function) stages a real hit chain:
Pidgeotto's (side 1) real turn-13 SAND_ATTACK against Onix (side 0), real
level-50 stats (unchanged since `docs/turn6-notes.md` §4: ONIX
atk/def/spd/spA/spD=51/187/76/36/72, PIDGEOTTO 98/61/77/56/56), real
turn-13 HP (Onix 4, Pidgeotto 16, `docs/turn13-notes.md` §3), real
pre-move stat stages (Onix's own ATK floored at the engine-encoded value 0
= real -6, unchanged; Onix's own accuracy neutral at 6 entering).

**The RNG seed and the accuracy-stage write are BOTH live-verified this
session with a fresh probe, not re-cited from the existing dossier text
alone** (the existing `docs/turn13-notes.md` §2 ledger names the *step
count* but never prints the actual `gRngValue` integers). Ran
`tools/probe/ram-probe.py` against `tools/probe/specs/turn13-rng-watch
.json`'s own committed 108-segment button script, extended locally (a
scratch copy, not a repo edit) with two extra watch columns
(`gBattleMons+0x1E`/`+0x76`, Onix's/Pidgeotto's own `statStages[STAT_ACC]`
byte, same offset convention `docs/turn13-notes.md` §3 already cites for
the ATK-stage columns): `gRngValue` flat at **2173905089** through tick
15429, `accStage0`(Onix) flat at **6** through tick 15463, `atkStage0`
flat at **0** (the floor) throughout. At tick **15430**, `gRngValue`
commits to **2287569056** — exactly the SAND_ATTACK accuracy-check roll,
matching `docs/turn13-notes.md` §2's own ledger row ("15430 | 1 |
Pidgeotto's SAND_ATTACK accuracy-family roll") to the tick. At tick
**15464**, `accStage0` commits **6 → 5** — matching `docs/turn13-notes.md`'s
own "(d)" finding to the tick. **Verified live this session**:
`advanceRngValue(2173905089)` (`src/engine/rng.ts`'s own `BigInt`-based LCG
step) equals EXACTLY 2287569056 — this module's own dedicated test
assertion. The seed entering the roll is simply turn 13's own entering
value (no LCG inversion needed), same shape §14.2 already established for
a flat-RNG-entering turn.

The real staged event dump (`vite-node`, this session, not hand-derived —
full provenance printed, not just `sourceLabel`):

```
accStageAfter: 5   (6 -> 5, byte-identical to this session's own live-probed
                     RAM finding above)
rngCalls: 1, rngValueAfter: 2287569056 (byte-identical to the live probe)
event kinds, in order:
  message                       {messageId:"STRINGID_USEDMOVE"}                        sourceLabel: BattleScript_EffectStatDown      (battle_scripts_1.s:538, Cmd_attackstring)
  set-battler-pp-data           {battler:1, movePosition:3, pp:14}                       sourceLabel: BattleScript_EffectStatDown      (:539, Cmd_ppreduce, 15 -> 14)
  stat-stage-change             {battler:0, stat:"accuracy", from:6, to:5}               sourceLabel: BattleScript_EffectStatDown      (:540, Cmd_statbuffchange)
  animation                     {animationId:"MOVE_ANIMATION", battler:1, args:[28,0,0,0,0,0]}  sourceLabel: BattleScript_StatDownDoAnim (:546, Cmd_attackanimation)
  animation                     {animationId:"STATS_CHANGE", battler:0, args:[27]}       sourceLabel: BattleScript_StatDownDoAnim      (:549, Cmd_playanimation)
  message                       {messageId:"STRINGID_DEFENDERSSTATFELL"}                sourceLabel: BattleScript_StatDownPrintString (:551, Cmd_printfromtable)
  set-battler-sprite-visibility {battler:1, invisible:false}                             sourceLabel: BattleScript_MoveEnd             (:268, moveend pass-through)
  set-battler-sprite-visibility {battler:0, invisible:false}                             sourceLabel: BattleScript_MoveEnd             (:268, moveend pass-through)
```

**This is a real, non-floored drop** (6 → 5, unlike §14's own floored 0→0
case) — so, unlike turn 11's own stream, this one DOES include the
`StatDownDoAnim` branch's two `animation` events (`MOVE_ANIMATION` +
`STATS_CHANGE`), matching turn 6's own WORKED-case shape (§12.2) rather
than turn 11's own short-circuited one. The `STATS_CHANGE` argument is
`27` here (vs. turn 6's own `46`, §11.2) — a different decorative value,
consistent with a different stat/direction combination; this module does
not chase that argument's own encoding further (out of this staging
module's own scope, decorative only, `battleScriptPlaystatchangeanimationOpcode.ts`'s
own header already documents it as "inert for this non-presentation engine
beyond being carried as the emitted event's decorative argument").

**The "roles inverted vs turn 6" question this checkpoint's own brief
raised, answered from these staged events, not assumed**: `changeStatBuffs`'s
own message-selection arithmetic (`battleScriptStatBuffs.ts:274-303`)
computes `isAttackerActive = target === activeBattler`; for SAND_ATTACK —
an opponent-targeted move (`MOVE_TARGET_SELECTED`, `moves.json` id 28) with
no `MOVE_EFFECT_AFFECTS_USER` bit, structurally identical to FEATHER_DANCE
in this respect — `activeBattler` is assigned `target` itself (Onix,
battler 0), so this comparison is trivially true, IDENTICALLY to turn 6's
own case (§12.2's own citation of the same source lines). **Roles are NOT
inverted**: both moves are opponent(Pidgeotto)-attacks-target(Onix,
player)'s-own-stat, same side pairing (attacker=1, target=0), same
`isAttackerActive` derivation, same resulting messageId family
(`STRINGID_DEFENDERSSTATFELL`, confirmed live above, `STRINGID_
ATTACKERSSTATFELL` absent) — proven, not merely asserted, by this staged
run's own event stream. The only genuine differences from turn 6 are the
`stat` value (`accuracy` vs `attack`) and the magnitude (1 vs 2, hence
`statFellBuff2`'s own "fell!" not "harshly fell!" tail, byte-matching
`battleScene.ts:11908`'s own already-committed `TURN13_ACCFELL_LINE2`
literal).

**Zero new/widened bridge function needed — a genuine finding, not an
assumption, proven by direct call.**
`presentationEventWindowBridge.ts`'s existing `resolveFeatherDanceKickoff
PresentationWindowContent` (built for turn 6's own WORKED branch, §12.3
step 1; already reused unchanged by turn 11's own floored branch, §14.2)
requires exactly three signals: a `message` under `BattleScript_
EffectStatDown`, a same-labeled `stat-stage-change`, and a `BattleScript_
StatDownPrintString`-labeled message. **All three are present in THIS
accuracy-down run too** (lines 538/540/551 above), with `stat:"accuracy"`
and `STRINGID_DEFENDERSSTATFELL` instead of turn 6's `stat:"attack"` — the
bridge's own `statChange.stat` field is populated generically from
whichever `stat-stage-change` event's own `stat` field is present, never
hardcoded to `"attack"` (confirmed by re-reading `presentationEventWindow
Bridge.ts:230-235` directly this session). Called UNCHANGED against this
staged run's own event list
(`resolveTurn13SandAttackWindowContent`, this module), it resolves
correctly — **verified live by this module's own passing test**
(`tests/turn13SandAttackPresentationStaging.test.ts`, 9/9 green), not
merely argued from the label match. §13's own table entry calling this "a
genuinely NEW bridge shape" was a fair *prior guess* from the mapping
table alone; the real staged run refutes it — the shape is new only in
its `stat` VALUE, not in its event-kind/sourceLabel STRUCTURE, and the
existing bridge already generalizes across both axes (floored-vs-worked,
attack-vs-accuracy) without modification.

**Resolver byte-identity, verified (the turn6/turn11 precedent test
shape)**: `resolveTurn13SandAttackKickoffLines()` resolves
`STRINGID_USEDMOVE` to `["Foe PIDGEOTTO used", "SAND-ATTACK!"]` —
byte-identical to `TURN13_SANDATTACK_LINE1`/`LINE2`
(`battleScene.ts:11813-11814`). `resolveTurn13AccFellLines()` resolves
`STRINGID_DEFENDERSSTATFELL`'s real template
(`src/data/gen/battle-message-templates.json`, `{B_DEF_NAME_WITH_PREFIX}'s
{B_BUFF1}\n{B_BUFF2}`) through the UNMODIFIED shared `resolveBattleString
Lines` to `["ONIX’s accuracy", "fell!"]` — byte-identical to `TURN13_
ACCFELL_LINE1`/`LINE2` (`battleScene.ts:11907-11908`), asserted directly
by this module's own test. `STAT_NAMES`'s own `STAT_ACC` entry is already
`"accuracy"` (lowercase, `battle-message-templates.json`, inspected
directly) — **no new asset extraction needed**, matching `docs/turn13-
notes.md`'s own "(c)"/assets finding that `stat-anim-banner.json` already
has the `accuracy` palette too.

**Named gaps, current as of this staged run** (§12.2/§13.2/§14.2 format):

| turn-N input | kernel replacement | today |
| --- | --- | --- |
| `sm.openElapsed`/`revealTick`/`sm.confirmElapsed`/`turn13SandAttackTextStartTick` dispatch chain (§15.1) | none — scheduler/PC state | **no plausible mapping**, same gap-7 class every prior window found |
| `TURN13_SANDATTACK_LINE1`/`LINE2` ("Foe PIDGEOTTO used\nSAND-ATTACK!") | `message{messageId:"STRINGID_USEDMOVE"}` | **fully proven, re-derived from a real run of THIS turn's own script** — mechanically identical to every sibling module's own kickoff row |
| Onix's own accuracy stat stage, 6 → 5 (never read anywhere in `battleScene.ts`, §15.1's own hidden-state finding) | `stat-stage-change{battler:0, stat:"accuracy", from:6, to:5}` | **emitted today, proven this session** — the real production emission site (`battleScriptStatBuffs.ts:274-303`) is reachable end-to-end from SAND_ATTACK's own real script entry with turn 13's own real neutral-entering stage |
| `TURN13_ACCFELL_LINE1`/`LINE2` ("ONIX’s accuracy\nfell!") | `message{messageId:"STRINGID_DEFENDERSSTATFELL"}` | **fully proven, byte-identical resolve** — the apostrophe glyph is already resolved (entry 520, re-confirmed by this module's own test), no prerequisite blocks this |
| accuracy-drop banner's own EXISTENCE/direction (`TURN13_SANDATTACK_ACC_*` constants, hardcoded today) | `stat-stage-change` (same event as above) `+` `animation{animationId:"STATS_CHANGE", battler:0, args:[27]}` | **emitted today, proven this session** — unlike turn 11's floored case, THIS run's own `StatDownDoAnim` branch genuinely fires (real drop, not floored), so a real `STATS_CHANGE` animation event exists to justify the banner's own existing hardcoded schedule |
| PP readout (Pidgeotto's own SAND_ATTACK, 1st use this battle, 15→14) | `set-battler-pp-data{battler:1, movePosition:3, pp:14}` | **emitted today, proven this run**, independently RAM-confirmed (`docs/turn13-notes.md` §3) |
| ONIX/PIDGEOTTO HP (4/16) | no `hp-change` events anywhere in this stream | **no kernel event needed** — SAND_ATTACK deals no damage, same "steady-state read" finding every prior sibling module already made |
| dirt-throw sprite table / attacker slide (`TURN13_SANDATTACK_DIRT_TABLE`, `turn13SandAttackPidgeottoX2`, Part A) | n/a — presentation-only sprite motion, RAM-exact already | not applicable to this module's own scope — a separate, already-wired mechanism (per `docs/turn13-notes.md`'s own "(i) pure wiring, verbatim" verdict for (a)) |
| DRAGON_BREATH half (`drawTurn13DragonBreathWindow`, out of scope) | n/a — a separate hit chain, Onix's own later move | not applicable to this window, same class as every prior window's own non-content tick anchors |

**What this staged run does and does not prove:** it proves the real
SAND_ATTACK opponent-target chain reproduces turn 13's OWN specific real
transition (6→5 accuracy, first use) and that the resulting `stat-stage-
change`/`STRINGID_DEFENDERSSTATFELL` pair (plus the real `STATS_CHANGE`
animation event) is genuinely reachable end-to-end through the real
script, using turn 13's OWN real RNG seed (live-probed, not inverted). It
also proves `presentationEventWindowBridge.ts` needs **zero** new or
widened bridge shape — refuting §13's own prior speculative "genuinely
NEW bridge shape" framing with a real staged run, not just re-asserting
the opposite. It does NOT re-derive the dirt-throw/attacker-slide
mechanism (already wired elsewhere, `docs/turn13-notes.md`'s own "(a)"
verdict, out of this module's own scope) or the DRAGON_BREATH half (a
separate, later hit chain, genuinely out of this window's own scope).

### 15.3 Ordered wiring plan (acceptance: `turn13-sandattack.json` still passes at 190/190, regression sweep over the adjacent turn-13 family plus the checkpoint's own standing acceptance bar unchanged)

This window's own new text (`TURN13_ACCFELL_LINE1/2`) has the SAME
apostrophe-bearing shape `TURN6_ATKFELL_LINE1/2`/`TURN11_ATKFLOOR_LINE1/2`
needed — but the prerequisite is **already satisfied** (entry 520,
re-confirmed §15.2's own byte-identity assertion), so nothing blocks this
plan.

1. Wire `drawTurn13SandAttackWindow`'s ACCFELL branch (`battleScene.ts:12076-12080`)
   to source its two message lines from `turn13SandAttackPresentationStaging.ts`'s
   `resolveTurn13AccFellLines()` instead of the raw `TURN13_ACCFELL_LINE1`/
   `LINE2` literals — byte-identical content, mechanical swap (§12.3/§13.3/
   §14.3's own precedent shape), same "resolve once at module load" pattern
   every sibling wiring step established. `TURN13_ACCFELL_LINE1`/`LINE2`
   themselves have no other call site today (`grep -n "TURN13_ACCFELL_LINE"
   src/engine/battleScene.ts` finds only this one definition + this one
   use) — this step retires their only direct read, but the constants can
   stay defined (harmless) or be inlined into the new resolved consts,
   whichever the wiring worker's own established convention (§12.5/§13.5)
   prefers.
2. Do **NOT** touch `drawTurn13SandAttackWindow`'s own kickoff-text branch
   (`:12081`, `TURN13_SANDATTACK_LINE1/2`) in this same step unless the
   wiring worker chooses to also fold in `resolveTurn13SandAttackKickoffLines()`
   — this literal has no other call site either (`grep -n
   "TURN13_SANDATTACK_LINE" src/engine/battleScene.ts` finds only this one
   definition + this one use, UNLIKE turn 6/7/8/11's shared kickoff-text
   literal), so wiring it carries no cross-window risk; still listed as
   optional/step-2 rather than mandatory-step-1 purely to keep this plan's
   own first step minimal and isolated, matching §11.3's own "narrow to
   what's actually unblocked" discipline.
3. Do **NOT** touch the accuracy-drop banner's own graphic code
   (`drawTurn13SandAttackAccBanner`, `:11867-11894`, and its `eva`/`bg1Y`
   schedule constants, `:11844-11864`) — §15.2 proves the kernel emits the
   fact this schedule assumes (a real accuracy drop, hence a real
   `STATS_CHANGE` animation), but wiring the banner's own TIMING to a
   kernel tick is a presentation-native concern (no kernel timestamp
   exists on any event, gap 4/7's own standing finding, unchanged) — out of
   this plan's own scope, same class as every prior window's un-wireable
   presentation-timing residuals.
4. The dirt-throw/attacker-slide mechanism (`drawTurn13SandAttackDirt`,
   `turn13SandAttackPidgeottoX2`, Part A) and the DRAGON_BREATH half
   (`drawTurn13DragonBreathWindow`) stay completely untouched — separate,
   already-wired-elsewhere or out-of-scope mechanisms, same "narrow to
   what's actually unblocked" discipline every prior window's plan used
   for its adjacent out-of-scope reads.
5. Re-run `npm run compare -- turn13-sandattack.json` and confirm it still
   matches at **190/190** (recorded count) before/after, PLUS a regression
   sweep of `turn13-menu.json` (57/57, this turn's own pre-open/confirm-
   press-transient sibling), `turn13-switchin.json` (242/242, this turn's
   own post-KO-dismiss sibling sharing `drawTurn13FieldBase`),
   `turn13-dragonbreath-faint.json` (141/141, this turn's own DRAGON_BREATH-
   half sibling, step-4's own explicit no-touch target), `turn12-menu.json`
   (46/46) and `turn12-aerialace.json` (131/131, the regime this window's
   own `turn13KickoffBounceTick`/`TURN13_REGIME8_TO_REGIME1_SHIFT` anchors
   off), `turn11-menu.json` (56/56) and `turn11-featherdance.json`
   (178/178, §14's own pick, sharing `resolveFeatherDanceKickoffPresentation
   WindowContent`), `turn10-aerialace.json` (93/93), `turn6-featherdance
   .json` (90/90) and `turn6-statfall.json` (127/127, this bridge's own
   FIRST two call sites), and `turn2-endeavor.json` (77/77) — the
   checkpoint's own established acceptance bar, matching the exact live
   counts §15.4 below re-pinned this session.

**No literal should die in this step.** `TURN13_SANDATTACK_LINE1`/`LINE2`
and `TURN13_ACCFELL_LINE1`/`LINE2` (`battleScene.ts:11813-11814`,
`:11907-11908`) each have exactly one call site (this window's own two
branches) — step 1 retires the ACCFELL branch's direct literal read only;
step 2 (optional) would retire the kickoff branch's.

### 15.4 Comparator re-pin

**A methodology finding, stated plainly before the numbers below, because
it bears directly on what "against 127.0.0.1:8014" means for THIS specific
trace family**: `turn13-sandattack.json` (like every sibling trace used in
this whole §8-§15 chain) has no `oracleProfile` field, so `tools/compare/
run.ts:87`'s own hardcoded default (`trace.oracleProfile ?? "battle-scene-on"`)
selects **battle-scene-on**, which `tools/compare/oracleProfiles.ts`
resolves to `POKEBENCH_ANIMATION_ORACLE_URL` — **127.0.0.1:8012** in this
session's own exported environment (confirmed directly: `oracleUrlForProfile
("battle-scene-on") === "http://127.0.0.1:8012"`), NOT the 127.0.0.1:8014
Battle-Scene-OFF oracle this side lane is nominally assigned. This is not
new drift introduced this session — re-running the SAME standard,
unmodified `npm run compare` invocation is exactly what reproduces every
count this whole dossier chain (§8-§14) has ever recorded for this trace
family, so it is the historically-correct, zero-drift invocation. Verified
directly this session that this is a real, structural fact and not a
fluke: forcing the literal 8014 URL (unsetting `POKEBENCH_ANIMATION_ORACLE_URL`
for one invocation) drops `turn13-sandattack.json` to 78/190,
`turn2-endeavor.json` to 23/77, and `turn6-featherdance.json` to 64/90 —
this whole "turn-N" presentation trace family's pixels were built against
Battle-Scene-ON's real output (richer move-effect animation content), and
genuinely do not replay identically under Battle-Scene-OFF (which the
oracle's own `bin/oracle info` documents as skipping "move/effect... front-
sprite entrance animations"). The KERNEL semantics this session's own
staging module exercises (RNG, PP, stat stages, message IDs) are
scene-mode-agnostic by construction (`battleScriptPlaystatchangeanimationOpcode
.ts`'s own header: "Under Battle Scene OFF this command's visible output...
is out of scope, but its effect on battle STATE is real and this port
models it exactly") — it is specifically the PRESENTATION comparator for
this pre-existing trace family that has always targeted ON pixels,
consistent across every sibling count below. Flagged here for the
supervisor's own visibility, not treated as a blocker: fixing it (if ever
wanted) would mean either giving these traces an explicit `oracleProfile`
field or accepting they measure a different thing than their name
suggests — both out of this recon-only step's own scope.

Ran twice live this session (determinism check), plus a named
adjacent-trace regression sweep, from this worktree, using the standard
unmodified `npm run compare` invocation (the historically-correct one,
per the finding above):

```
$ npm run compare -- turn13-sandattack.json --summary   (run 1)
190/190 frames matched -> tools/compare/out/latest

$ npm run compare -- turn13-sandattack.json --summary   (run 2, determinism check)
190/190 frames matched -> tools/compare/out/latest

$ npm run compare -- turn13-menu.json --summary
57/57 frames matched -> tools/compare/out/latest

$ npm run compare -- turn13-switchin.json --summary
242/242 frames matched -> tools/compare/out/latest

$ npm run compare -- turn13-dragonbreath-faint.json --summary
141/141 frames matched -> tools/compare/out/latest

$ npm run compare -- turn12-menu.json --summary
46/46 frames matched -> tools/compare/out/latest

$ npm run compare -- turn12-aerialace.json --summary
131/131 frames matched -> tools/compare/out/latest

$ npm run compare -- turn11-menu.json --summary
56/56 frames matched -> tools/compare/out/latest

$ npm run compare -- turn11-featherdance.json --summary
178/178 frames matched -> tools/compare/out/latest

$ npm run compare -- turn10-aerialace.json --summary
93/93 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-featherdance.json --summary
90/90 frames matched -> tools/compare/out/latest

$ npm run compare -- turn6-statfall.json --summary
127/127 frames matched -> tools/compare/out/latest

$ npm run compare -- turn2-endeavor.json --summary
77/77 frames matched -> tools/compare/out/latest
```

`turn13-sandattack.json` matches its recorded count (190/190) both runs —
re-pinned live, this is the baseline the wiring step (§15.3) must
preserve. Every adjacent trace re-confirms its own current live count
(two — `turn12-aerialace.json`/`turn10-aerialace.json` — read higher than
a stale 2026-07-21 doc citation of 56/56 and 23/23 in `docs/turn13-notes
.md`'s own Part-A session, because those traces' own `captureFrames` have
been extended by later sessions since; not a regression, just this
session's own live count superseding an older, narrower citation), proving
this session's read-only recon (plus the new unwired `turn13SandAttack
PresentationStaging.ts` module) touched nothing live. `npm test` **273
files, 3618 tests** (272/3609 at §14's own baseline + 1 new file/9 new
tests from this session's own `turn13SandAttackPresentationStaging.test.ts`).
`npm run build` clean. `executableFrontierRatchet.test.ts` unmoved (6/6,
zero new barriers, no canonical recording import added).
