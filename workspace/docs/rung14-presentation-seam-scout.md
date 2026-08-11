# Rung 14 presentation-seam breadth scout

> **STATUS FROZEN — 2026-07-29 PDT, engine HEAD
> `6977592a7f54ed8f2f7d2681f7929db1d1561990`.** This is a breadth map of that
> tree, not an evergreen design. Battle Scene OFF `bin/oracle info` was healthy
> and the baseline `npm test` / `npm run build` passed before this audit.
>
> Engine evidence re-read at this HEAD:
>
> ```text
> rg -n "createCanonicalFactorySwapPresentation|factorySwapRoundDecision|chooseRoundSwap" src tests
>   -> only canonical presentation construction is core.ts:572;
>      the generic mutation/decision seam is factorySwap.ts:201-276.
> rg -n "createPostwinState|scoutingLines|currentOpponent.rentalRecords" src/engine
>   -> postwin accepts a party at postwin.ts:108-145 and core passes the
>      current opponent's generated records at core.ts:738-742.
> rg -n "roundCompleted|roundLost|createFactoryTerminalPresentation" src/engine
>   -> core.ts:352-392 creates the terminal from the round presentation command.
> rg -n "ANCHOR_DRAFT_SCREEN_STATE|turn15PartySelect|forced-switch" src/engine
>   -> core.ts:301 still installs the anchor draft; partySelect.ts:5-279 and
>      battleScene.ts:14238-15577 are the recorded ONIX/MAGBY path; the kernel
>      publishes typed forced-switch requests in battleDecisionBoundary.ts:44-101.
> ```
>
> Git verification: `1c78886d` landed the trainer-identity seam,
> `8ec1cd81` landed party-derived commentary, and `9a741230` landed the
> generated round/battle orchestrator. No production file was changed by this
> scout.

## Scope and trace-count convention

“Capture count” below is the literal number of `captureFrames` in the
committed artifact. A trace without `oracleProfile` is a historical
Battle-Scene-ON trace under the current contract; it is evidence of the
canonical window, **not** Rung 14's requested explicit OFF proof. The terminal
comparators are fixtures rather than ordinary trace JSON: their counts are the
inclusive staged `relativeWindow` lengths.

## Window inventory

| Rung-14 window | Existing exact evidence | Renderer today and input class | Existing semantic source | Concrete gap |
| --- | --- | --- | --- | --- |
| Draft | `draft-cursor.json` **13**, `draft-menu.json` **38**, `draft-menu-slot6.json` **66**; all historical (no explicit OFF profile). | `factoryDraftScreen.ts:202-685`; `core.ts:296-320` installs `ANCHOR_DRAFT_SCREEN_STATE`, whose slots are the extracted anchor pool at `factoryDraftScreen.ts:688-710`. **Canonical state.** | `generateInitialFactoryRentals` exists behind the generated-round orchestrator (`factoryRoundBattleOrchestrator.ts:86-136`), including selected rental records. | No adapter turns six generated rental records into `DraftScreenState.slots`, and the renderer only has the extracted anchor's visual/data surface. This is a data/assets and state-construction task, not a one-line controller wire. Record a fresh explicit-OFF draft trace only after the generated draft can be booted without staging a canonical pool. |
| Commentary | `battle1-postwin-scout-a.json` **171** and `battle1-postwin-scout-b.json` **164**, both historical; no committed explicit-OFF commentary trace. | `postwin.ts:102-145` derives its four pages; `core.ts:1750-1876` renders those `scoutingLines`. **Generated semantic state for page text.** | `factoryCommentary.ts:20-304` accepts a three-member source party; `core.ts:738-742` converts `roundController.rules.currentOpponent.rentalRecords` with `createFactoryCorpusParty` before `createPostwinState`. | The text seam is already generic, but no generated round reaches this canonical post-win clock in `core.ts`; its HP/room transition and the trace route still describe Battle 1. The current canonical party must first prove byte-identical through the explicit party argument, then a generated-party app-stage/route can be compared OFF. |
| Battle command | `battle2-action-menu-dense.json` **209**, historical; no committed explicit-OFF command-menu trace. | The shared FIGHT submenu accepts an active moveset, but `core.ts:787-793` chooses it from the recorded draft/Turn-15 handoff and `battleScene.ts:15574-15640` dispatches the recorded scene windows. **Mostly canonical/turn-keyed.** | The kernel publishes `BattleCommandRequest` with side, battler, request id, and legal move/switch decisions (`battleDecisionBoundary.ts:44-50`); its rules context carries party, HP, PP, move slots and active indexes. | There is no presentation adapter from a live command boundary/rules context to action-menu chrome, arbitrary healthboxes, move names/PP, or input submission. Do not add another turn number to `battleScene.ts`; this requires a bounded generic command-menu seam first. |
| Forced switch | `turn15-party-select.json` **200** and delayed counterpart **200** (the original dense focused proof is recorded as **143/143** each in `party-menu-notes.md:373`); both historical, no explicit-OFF trace. | `partySelect.ts:5-279` names ONIX/MAGBY/BAYLEEF and `battleScene.ts:14238-14359,15491-15577` renders their extracted chrome, MAGBY send-out and fixed healthbox. **Canonical/turn-keyed.** | A `BattleForcedSwitchRequest` exposes fainted and legal party indexes (`battleDecisionBoundary.ts:52-63`); full rules state supplies every party member and the resumed boundary. The source-backed lab recipe below proves the native controller route. | No request-to-party-menu adapter, no arbitrary party icons/healthboxes, and no generic selection-to-`submitBattleDecision` bridge. This is smaller than rewriting the whole scene, but it is not yet a reusable UI component. |
| Swap | Explicit OFF: player picker `battle1-swap-player-picker.json` **101**, options **58**, enemy picker **130**, accept prompt **66**, accept exit **43**; additional complete branches include summary return **147**, enemy-PKMN return **115**, and duplicate rejection **52**. | `factorySwap.ts:3-276` is a general six-record state machine. `factorySwapPresentation.ts:35-79,229-240` is a reusable timing adapter, but its only constructor feeds `CANONICAL_SWAP_*` records built from anchor/opponent constants at `:119-197`. `core.ts:562-573` invokes that canonical constructor. **Generic reducer, canonical entry data.** | Round state already has player party/rental records and `currentOpponent.party/rentalRecords` (`roundController.ts:46-68`); accepted UI state becomes a typed decision through `factorySwapRoundDecision` (`factorySwap.ts:248-276`), and the round accepts it through `chooseRoundSwap` (`roundController.ts:529-599`). | This is the cheapest genuine presentation gap: add a round-record-to-swap presentation factory and command-completion bridge. Preserve the canonical constructor as the equivalence baseline; no new timing model is needed. |
| Seventh win | Explicit OFF staged comparators: `factory-terminal-round-won-off.json` **2513/2513** and continuation **1911/1911**. (The related loss comparators are **210/210** plus **414/414**.) | `factoryTerminalPresentation.ts:232-605` is phase-relative and `factoryTerminalRender.ts:195-260` renders it. `core.ts:352-392` creates it from `roundCompleted` / `roundLost` and acknowledges its command without mutating round rules. **Generated command state.** | `resolveRoundBattle` emits `roundCompleted` at battle index 6 (`roundController.ts:443-525`); `BattlePresentationCommand` carries command id and battle index (`battlePresentation.ts:12-41`). | **Already generic for the command/outcome seam.** Its static lobby renderer deliberately has no trainer/party content. The remaining issue is only reaching it through the live app round owner, not terminal presentation conversion. |

## What Rungs 9–10 actually landed

The three seams should not be described as hypothetical:

- Trainer identity is live at the presentation boundary. Generated
  `factory-trainer-N` opponents resolve to name, class, sprite symbol, and
  Easy Chat speeches in `factoryTrainerPresentation.ts:66-122`; `core.ts`
  threads that object into both `battleRoom` and `battleScene`
  (`:352-354,490-527,1234-1246`). The remaining breadth limitation is visual:
  `battleScene.ts:2575-2588` maps only `TRAINER_PIC_FISHERMAN` specially and
  falls back to Bug Catcher art.
- Commentary is live at the content boundary. `createPostwinState(party)`
  uses generated party data and the core passes the current opponent records
  at the post-win handoff. It is therefore not a text-literal conversion task.
- Swap timing, cursor copies, input gates, mutation timing and typed round
  decision are generic. Only its initial player/enemy/rental records and the
  command lifecycle are still injected as the canonical Battle-1 offer.
- Terminal is the completed proof: it is driven from `roundCompleted` rather
  than a Battle-7/absolute-tick branch, and both dense OFF comparator windows
  already prove it.

## Cost ranking (lowest first)

1. **Seventh win — already generic; no conversion.** Re-run the two OFF
   comparator fixtures as regression evidence when the live round owner is
   connected.
2. **Swap — low, genuine gap.** The state machine and pixels are complete;
   only record/command adaptation is missing.
3. **Commentary — low/medium, genuine route gap.** Party-to-lines is already
   generic, but an app-visible generated route/stage is needed for OFF pixels.
4. **Trainer identity — medium.** Text/speech are generic, but arbitrary
   trainer-pic extraction/render selection is not; this is a separate asset
   breadth slice, not a `battleScene` rewrite.
5. **Draft — medium/high.** Generation exists, but converting arbitrary six
   rentals into a fully visual draft requires the missing sprite/slot data
   surface as well as state construction.
6. **Forced switch — high.** The request and mechanics are generic; the
   screen's reducer, chrome, icons, status overlays, send-out text and
   healthbox are named to the canonical three rentals.
7. **Battle command — highest.** It crosses the large recorded
   `battleScene.ts` dispatcher and must consume live active party/PP/menu
   state without introducing a new turn-keyed branch.

## Recommended step 1 — generic swap entry, with canonical equivalence first

**Goal (one worker, <=45 minutes):** add a constructor beside
`createCanonicalFactorySwapPresentation` that accepts the round's full player
rental records plus current opponent rental records, derives the two visible
three-mon parties with `createFactoryCorpusPartyMember`, and calls the already
generic `createFactorySwapState`. Add a tiny adapter that consumes the pending
`swapOffer` command, and on the source copy boundary submits
`factorySwapRoundDecision` through `chooseRoundSwap`; acknowledgement remains
the existing presentation protocol.

- Files: `factorySwapPresentation.ts`, `core.ts`, narrowly focused
  `factorySwapPresentation.test.ts` / `factorySwap.test.ts`; do not edit the
  generic round rules or rewrite `battleScene.ts`.
- Semantic source: `roundController.rules.playerRentalRecords`,
  `.playerParty`, `.currentOpponent.rentalRecords`, and `.currentOpponent.party`
  (`roundController.ts:46-68`), rather than `anchor-state.json` or
  `BATTLE_1_FRONTIER_MON_INDICES`.
- Equivalence proof: construct the existing canonical six records through the
  new factory and assert the state is equal to
  `createCanonicalFactorySwapPresentation`; then run the committed explicit
  OFF `battle1-swap-player-picker.json` at **101** and
  `battle1-swap-enemy-accept-exit.json` at **43**. The canonical visual route
  should call the generic constructor for this proof, not a duplicate image
  path.
- New trace: **none initially.** Existing dense OFF windows cover the exact
  canonical path. Only after a real generated round can reach `swapOffer`
  should a short explicit-OFF generated-record trace be added; it must retain
  all captures, not replace/thin the canonical ones.

## Recommended step 2 — commentary app-stage seam, not new commentary rules

**Goal (one worker, <=45 minutes):** make the existing party-derived
`createPostwinState` visible to an explicit app-stage that accepts a generated
three-record opponent party, then prove the canonical party is byte-identical
through that stage before choosing one materially different generated party.
This is a bounded presentation harness/adapter task; do not alter favorite
type/style classification.

- Files: `tools/compare/appTrace.ts` (a named staged post-win state), a small
  helper in `postwin.ts` or `core.ts` only if needed to accept records, and
  `tests/postwin.test.ts` / `tests/factoryCommentary.test.ts`.
- Semantic source: `createFactoryCorpusParty(currentOpponent.rentalRecords)`
  exactly as `core.ts:738-742` already does, then
  `createPostwinState(opponentParty)` (`postwin.ts:108-145`).
- Equivalence proof: stage the canonical set IDs/personality/IV/ability
  records used by the current post-win path, and re-verify
  `battle1-postwin-scout-a.json` at **171** and
  `battle1-postwin-scout-b.json` at **164** before widening. Those two are
  historical; they establish content/timing equivalence, not OFF acceptance.
- New trace: add one **explicit `battle-scene-off`** staged commentary trace,
  dense from the type page through the style page, using a generated party
  whose favorite type and style both differ from the canonical one. Its oracle
  counterpart must be an honest Factory route or a source-valid staged field
  checkpoint; a mechanic-lab battle cannot supply this pre-battle dialogue.

## Battle-lab applicability today

Battle lab starts *after* the attendant's scouting speech
(`tools/battle-lab/README.md`), so it cannot pixel-compare draft, commentary,
swap, or seventh-win UI today. Nor does `npm run compare -- <trace>` accept a
battle-lab scenario as an app-state initializer. It can nevertheless provide
the real-ROM pixel/semantic reference for the two battle-field windows:

- **Forced switch:** run
  `bin/oracle lab tools/battle-lab/mechanic-forced-switch-player-choice-off.json -o <fresh-dir>`.
  The checked-in `mechanicLab` recipe uses `overrides.parties`, seed `1`, and
  three complete player and trainer parties; its ordinary trace drives the
  KO, party-menu selection and resume. For the AI replacement variant use
  `mechanic-forced-switch-ai-choice-off.json`: player URSARING/Strength kills
  opponent SUNKERN, with PIDGEY and MACHOP benches, proving the source selects
  MACHOP (slot 2) rather than the next living slot. See
  `forced-switch-ground-truth.md` §§2–3 for the exact field and input ledger.
- **Battle command / arbitrary healthboxes:** use any complete
  `mechanicLab` `overrides.parties` scenario (for example the same forced
  switch fixture before its KO) with three full legal Pokémon per side:
  `species`, four moves, level/nature, six IVs, six EVs, item, ability slot,
  friendship/gender/personality as required. The ROM constructs HP, PP,
  moves, types and healthboxes and the manifest records them. This is useful
  ground truth for a future adapter, but is **not yet an app-vs-oracle pixel
  comparison** because no battle-lab-to-EngineState bridge exists.

The precise conclusion is therefore: no non-canonical Rung-14 UI window can
yet be app-pixel-compared through battle lab. The lab is immediately usable as
the OFF oracle reference for arbitrary command/forced-switch field state; the
swap and commentary steps above are the shortest path to turning comparable
semantic state into app pixels.
