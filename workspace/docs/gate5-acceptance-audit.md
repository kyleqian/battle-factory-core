# Gate-5 acceptance audit

Clause-by-clause evidence map for ROADMAP.md S10 Gate 5 ("Facility
integration", `ROADMAP.md:1500-1511`), against the current worktree HEAD
(`50ad4210`, 2026-07-30). Baseline before this audit: **551 files / 5586
tests + 1 deliberate animation-lane skip**, build clean (PROGRESS entry 753).

Method: every verdict below is backed by a citation a reviewer can check —
file:line, a test file + count from a fresh focused `npx vitest run` on this
tree, a committed oracle trace + its recorded/re-verified compare count, or a
commit hash. Nothing here is taken on faith from a PROGRESS entry alone where
a focused check was cheap; several of the highest-stakes claims below were
independently re-run during this audit (marked "re-verified live").

Full Gate-5 acceptance text, verbatim (`ROADMAP.md:1500-1511`):

> 5. [ ] **Facility integration:** generate initial rentals and all seven real
>    opponent parties through the source-exact range/retry/personality/IV/
>    ability/item rules; run the native Factory AI; compute the attendant's
>    favorite-type/style commentary from the generated party; render arbitrary
>    trainer classes/names/speeches and arbitrary legal parties; support
>    voluntary and forced switching. The round controller consumes real battle
>    outcomes rather than injected results. Source-faithful AI tests
>    independently cover move limitations, per-script score changes, tie RNG,
>    battle history and known-information behavior, switch/item selection, and
>    every Factory challenge-policy branch. Integration tests prove that the
>    AI returns only a kernel-enumerated legal decision and enters through the
>    same submission boundary as a player or test decision.

---

## (a) Initial rentals: source-exact range/retry/personality/IV/ability/item rules

> "generate initial rentals ... through the source-exact range/retry/
> personality/IV/ability/item rules"

**VERDICT: PARTIAL**

The algorithm itself is a faithful, cited port:
`generateInitialFactoryRentals` (`src/engine/factoryRentalGeneration.ts:223-400`,
introduced `2c7091e0`) ports `GenerateInitialRentalMons`
(`reference/pokeemerald/src/battle_factory.c:509-601`) function-for-function:

- Rank/range selection: `getFactoryRentalRank` (`:153-158`) ports
  `GetNumPastRentalsRank` (`battle_factory.c:868-886`);
  `getLevel50FactoryRentalRange` maps against `battle_factory.c:829-866`.
- Retry rules: the `while (selected.length !== 6)` loop (`:251-323`)
  reproduces the Unown/duplicate-set/duplicate-species (with the stateful
  `currSpecies` exception)/duplicate-item rejection order, each citing its C
  line range.
- Personality roll: low-word-then-high-word `Random32()` rejection loop
  (`:337-375`), citing `pokemon.c:2569-2575` / `include/random.h:7-16`.
- Fixed IV: `getLevel50InitialRentalFixedIv` (`:186-200`) cites
  `battle_factory_screen.c:1757-1771`.
- Ability slot: `abilitySlotForPersonality` (`:202-212`) cites
  `pokemon.c:2296-2300`.

Test evidence: `npx vitest run tests/factoryRentalGeneration.test.ts` — **7
passed**. These pin exact Random()-call ledgers (198/522/335/286 calls) and
specific retry sequences (duplicate-item, duplicate-set, duplicate-species,
the seed-237 `currSpecies` exception) against the ported logic.

**The missing artifact:** the production anchor route never calls this
function. `factoryAnchorSession.ts` loads the RAM-verified Battle 1 draft
from `src/data/gen/anchor-state.json` (ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/
QUILAVA at `gRngValue=0xd2ddeec8`) as fixed data.
`tests/anchorRentals.test.ts` (**45 passed**) cross-validates that fixture's
species/moves/nature/EVs/stats against extracted tables — real ROM ground
truth for rental *content* — but no test calls
`generateInitialFactoryRentals(0xd2ddeec8, ...)` and asserts it reproduces the
RAM-dumped anchor draft. The algorithm is proven source-faithful by code
review + synthetic-seed unit pins, but not receipt-linked to a real ROM RNG
trace. **Discharging artifact:** one test that feeds the anchor's real RNG
cursor into `generateInitialFactoryRentals` and asserts byte-identity with
`anchor-state.json`.

## (b) All seven real opponent parties, generated the same way (incl. no-repeat)

> "and all seven real opponent parties through the source-exact
> range/retry/personality/IV/ability/item rules" (the parenthetical
> "incl. no-repeat rules across the round" is this audit brief's gloss on
> the no-repeat requirement implicit in "real"; it is not separate ROADMAP
> text)

**VERDICT: PARTIAL**

Structurally discharged: `factoryRoundBattleOrchestrator.ts` calls the
identical `generateOpponentFor` → `generateFactoryOpponent` for every battle
in the round — battle 0 at `:447-448`, battles 1-6 at `:672-703`
(`advanceFactoryRoundPresentation`, `presentingSwapResult` branch), passing
`previous.storedTrainerIds` (`:683`) and `nextSavedRentalRecords(state)`
(`:684` — all six current player+opponent set IDs) forward each time. That is
the no-repeat state thread. `generateFactoryOpponent`
(`factoryOpponentGeneration.ts:393-587`) ports `GenerateOpponentMons`
(`battle_factory.c:303-376`) including the trainer retry-until-not-in-history
loop (`selectFactoryTrainer`, `factoryTrainerSchedule.ts:135-194`, citing
`battle_factory.c:316-329`) and the species/item/saved-rental/high-tier
rejection order.

Test evidence: `tests/factoryOpponentGeneration.test.ts` (**6 passed**)
includes a no-repeat-specific case ("selects battles 0, 1, and 2 on one
cursor and retries a prior trainer", `:190-251`) proving trainer id 18 is
rejected as `previously-fought` on battle 2. `tests/opponentGen.test.ts`
(**10 passed**) pins the RNG/nature primitives.

**The gap:** only **battle 1** (pre-anchor, RAM-baked trainer 50 DESTIN,
sets 188/184/135) and **battle 2** (`ROADMAP.md:550`: "source/RAM-pinned
12-call RNG sequence... 16/16 exact", RAM-verified FISHERMAN JENSON/KABUTO)
have real ROM oracle receipts for the *generated identity*. ROADMAP.md
explicitly declines to extend pixel/oracle verification to battles 3-7
(`ROADMAP.md:520-524`, S8 closure): "Tick 33332…, later turns, and Battles
3–7 must not become sequential pixel-window milestones... use deterministic
scenarios, controlled seeds, source-derived state... instead." The census
docs (`anchor-draft-combo-census*.md`, `seed-sweep-31-60/61-90-census.md`)
self-declare "pure kernel run, makes no oracle calls per row" — they prove
engine robustness (no halts/crashes across many seeds/combos), not
opponent-generation correctness against real ROM RNG for battles 3-7. This is
consistent with the ROADMAP's own decision, so it is not a broken promise —
but it means no battle-3..7 opponent identity is receipt-verified today, only
unit-pinned for algorithm fidelity. **Discharging artifact:** none required
by the ROADMAP's own S8 decision; if the supervisor wants this closed
tighter, the artifact would be one dense multi-battle round trace (or a
`mechanicLab`-style RNG-cursor probe) spanning battles 3-7's generated
identity against RAM.

## (c) Native Factory AI runs (move selection); which masks/branches are live

> "run the native Factory AI"

**VERDICT: PARTIAL**

Mask selection (which AI script set a trainer uses) is fully live:
`selectFactoryAiMask` (`src/engine/factoryAiMaskSelection.ts:151-188`) ports
`GetAiScriptsInBattleFactory` (`battle_factory.c:889-911`) — all 5 source
branches (tent / frontierBrain / challengeBelow2 / challengeBelow4 /
challengeAtLeast4) implemented, data-driven from
`data/gen/factory-ai-policy.json`. `npx vitest run
tests/factoryAiPolicy.test.ts tests/factoryAiMaskSelection.test.ts` — **35
passed** (3 + 32). DISCHARGED for mask selection specifically.

Move-scoring is a large, real, but bounded-partial port:

- **AI_CheckBadMove** (`factoryAiCheckBadMove.ts:1-651`, cites
  `data/battle_ai_scripts.s:51-651`): universal preamble (power
  classification, FISSURE/HORN_DRILL short-circuit, type immunity, 5
  ability-negation branches, Soundproof) plus **28 ported `runCbm*`
  handlers** (SpeedDown, AttackDown, DefenseDown/SpDefDown, AttackUp/
  DefenseUp/BulkUp, SpeedUp/SpAtkUp, CosmicPower/CalmMind, weather trio,
  Roar, Sleep, Paralyze, Confuse/Swagger/Flatter, ...). Any move effect
  outside the ~100-entry `AI_CHECK_BAD_MOVE_TABLE_EFFECTS` source table halts
  at a named `kind: "unsupported-branch", barrier: "factory-ai-check-bad-move"`
  (`:374,1321`) rather than silently mis-scoring. `npx vitest run
  tests/factoryAiCheckBadMove.test.ts` — **173 passed**.
- **AI_CheckViability** (`factoryAiCheckViability.ts:1-70+`, cites
  `data/battle_ai_scripts.s:652-2615`): **33 ported `runCv*` handlers**
  against a ~90-unique-handler source table; every other entry halts at
  `barrier: "factory-ai-check-viability"` (`:668,3542`). `npx vitest run
  tests/factoryAiCheckViability.test.ts` — **324 passed**.
- **AI_TryToFaint** (`factoryAiTryToFaint.ts:1-24`, cites
  `data/battle_ai_scripts.s:2616-2634`): fully ported, reuses kernel
  `damageCalc.ts`. **10 passed**.

Total for the three scoring modules: 507 passing tests, plus the 35 mask
tests above = 542. The remainder of the CBM/CV effect tables is a named,
tested-to-halt machine barrier (visible in a diff, per AGENTS.md's
registration policy) rather than a silent gap — but it is real missing
breadth, not a rounding error: roughly 70+ CBM effects and 55+ CV handlers
remain behind the barrier. Note `tests/executableFrontierRatchet.test.ts`
(432 lines) has **no barrier-count entries for any `factoryAi*` module** —
the remaining-table inventory exists only as prose in file-header comments,
not as an executable pin (see clause (j) sub-item 5 below, same gap).

**Discharging artifact:** either (1) close enough of the remaining
CBM/CV table to argue diminishing returns, or (2) explicitly accept the
barrier count as the Gate-5 boundary and add a ratchet pin for it (so future
regressions are visible) — a documentation/process fix, not new engine work.

## (d) Attendant favorite-type/style commentary from the generated party

> "compute the attendant's favorite-type/style commentary from the generated
> party"

**VERDICT: PARTIAL**

Algorithm port — DISCHARGED: `src/engine/factoryCommentary.ts` cites
`battle_factory.c` line ranges in its header (`:1-15`) and matches 1:1:
`getFactoryOpponentFavoriteType` (`:187-220`) ports
`GetOpponentMostCommonMonType` (`battle_factory.c:603-655`, including the
slot-2-not-reset quirk and the tie→`FACTORY_NO_FAVORITE_TYPE` fallback);
`getFactoryMoveBattleStyle`/`getFactoryOpponentBattleStyle` (`:173-250`) port
`GetMoveBattleStyle`/`GetOpponentBattleStyle` (`battle_factory.c:657-705`,
including the 7 move-style tables at `:44-121` transcribed symbol-for-symbol
and the `count > 2 → FLEXIBLE` rule).

Test evidence, re-verified live during this audit: `npx vitest run
tests/factoryCommentary.test.ts` — **35 passed**. Every assertion is a
hand-computed literal pin (`it.each` tables over hand-picked species and move
lists checked against values derived by re-reading the C logic) — **no RAM
probe, no `oracleProfile`, no captured pixel/text anywhere in this file**,
including the "rung-8 generated opponent integration" block, which only
checks internal consistency between two RNG seeds' own outputs.

ROM ground truth exists **only for the fixed canonical opponent party**:
`tools/compare/traces/battle1-postwin-scout-a.json` (171 captures) and
`-b.json` (164 captures) both declare `appStage.id =
"factory-postwin-canonical-opponent-party"` (BUTTERFREE/HAUNTER/QUILAVA, set
IDs 153/179/181 per `tests/factoryCommentary.test.ts:288-324`), and are
historical Battle-Scene-**ON** traces (no `oracleProfile`), not this lane's
OFF-profile evidence. `docs/rung14-presentation-seam-scout.md:44` states
plainly: "both historical; no committed explicit-OFF commentary trace," and
its "Recommended step 2" (`:123-152`) proposes exactly the missing artifact
— "one explicit `battle-scene-off` staged commentary trace... using a
generated party whose favorite type and style both differ from the canonical
one" — not yet done.

Current, confirmed-live gap (PROGRESS.md top entry, **753**, 2026-07-30
~22:06, lines 40-42): "the attendant-commentary checkpoint needs a *specific*
party, but `preview_report` picks a seed, not an opponent — seed search or a
harness ask." Cross-confirmed in `docs/interactive-routing-flip-design.md:671`.
No later entry supersedes this.

**Discharging artifact:** one explicit `battle-scene-off` staged commentary
trace over a generated (non-canonical) opponent party whose favorite type and
style both differ from the canonical one — blocked only on selecting/staging
that specific party (seed search or a harness ask per entry 753), not on
missing engine logic.

## (e) Render arbitrary trainer classes/names/speeches

> "render arbitrary trainer classes/names/speeches"

**VERDICT: DISCHARGED**

`getFactoryTrainerPresentation(trainerId)`
(`src/engine/factoryTrainerPresentation.ts:73-100`) indexes any of the 300
generated `battle-frontier-trainers.json` entries and joins through
`facility-class-lookups.json` for name, facility/trainer class, trainer-pic
symbol, and all three Easy Chat speeches (before/win/lose,
`:60-70`). `factoryTrainerPresentationForOpponent` (`:108-121`) derives this
for an arbitrary generated opponent's `factory-trainer-N` id.

The previously-tracked limitation ("only `TRAINER_PIC_FISHERMAN` mapped
specially, everything else falls back to Bug Catcher art" —
`docs/rung14-presentation-seam-scout.md:59-60`, dated 2026-07-29) is
**fixed, not still open**: at current HEAD,
`resolveFrontierTrainerPic` (`src/engine/battleScene.ts:14249-14257`) looks
up the symbol in a table built from the full 50-entry
`frontierTrainerPicsAsset` and **throws** ("missing extracted Frontier
trainer picture ...") rather than silently substituting art. Commit
`51438230` ("Render generated Frontier trainer pictures generically",
2026-07-29 11:05) is the fix, landed one day before the stale scout note.

`npx vitest run tests/frontierTrainerPics.test.ts` — **7 passed**
(re-verified live), including an explicit "throws loudly instead of falling
back when an extracted picture is missing" case and a check that all 300
corpus trainers resolve through their facility class to an extracted
picture. `tests/battleTrainerPics.test.ts` — **6 passed**, a narrower legacy
regression pin superseded for coverage purposes by the file above.

Residual (integration-wiring, not a rendering-capability gap):
`docs/trainer-pic-off-window-scout.md` (2026-07-30, current) notes the
presentation *data* layer is complete/generic, but the live intro
choreography/timing for a generated (non-canonical) battle start is not
fully wired into `battleScene.ts`'s render loop yet. This is the same class
of "wiring, not capability" gap that clause (i)/(k) below shows is largely
closed by the #53 flip; it does not block this clause's DISCHARGED verdict,
which is specifically about whether arbitrary class/name/speech data *can*
be rendered.

## (f) Render arbitrary legal parties (sprites/icons/healthboxes)

> "and arbitrary legal parties" [render] — note the 376-species battle-pic
> catalog state

**VERDICT: DISCHARGED — catalog is 376/376 (complete)**

`npx vitest run tests/battleMonPicCatalog.test.ts` — **2 passed**
(re-verified live). This is an exhaustive completeness check, not a sample:
it asserts `battle-frontier-mons.json` spans 374 Level-50 + 2 Open-only = 376
distinct species, then for **every one of the 376** asserts a valid 64×64
4bpp back tileset, front tileset (+ frame2 for the 2-frame entrance
animation), 16-color palettes, and non-degenerate coordinates in
`mon-pic-coords.json`; a second sub-test regenerates both catalogs
byte-for-byte via `tools/extract/extract-battle-mon-pics.ts` and diffs
against the committed JSON. Corroborated by `PROGRESS-archive.md` entry
**#699** ("Battle-command seam Slice 3 landed"): "both battle-pic catalogs
now cover all **376** Factory species (374 Level-50 + 2 Open-only; back 3.5
MB, front 6.8 MB)... generated-data coverage test added."

`tests/battleMonPics.test.ts` — **8 passed**, targeted byte-exact pins
(ONIX/MAGBY/MURKROW/GROVYLE/PIDGEOTTO vs. oracle screenshots) plus a
`>400`-species sanity floor on `mon-pic-coords.json` — complementary
regression pins, not the completeness proof (that is the catalog test
above).

Healthbox rendering is species-generic by construction, not limited to the
canonical three: `composeOpponentHealthbox`/`composePlayerHealthbox`
(`src/engine/healthboxAssembly.ts`) take `{name, level, gender, hpFraction,
status, currentHp, maxHp}` — no species-sprite dependency.
`tests/healthboxAssembly.test.ts` — **29 passed**, including explicit
genericity cases ("stays parameterized: a different name/gender/level
renders without GROVYLE-specific constants", rendering MISDREAVUS/MAGIKARP).
`tests/battleHealthbox.test.ts` — **7 passed**, pins only the shared
static frame/palette assets.

There is no remainder on this clause: the catalog is complete and the
renderer is species-generic.

## (g) Voluntary switching supported end-to-end (player + AI ShouldSwitch)

> "support voluntary and forced switching" (voluntary half)

**VERDICT: DISCHARGED**

Player path: `submitPartySelectBattleDecision`
(`src/engine/partySelect.ts:517-531`) builds a `{kind: "switch", ...}`
decision and calls `submitBattleDecision` (imported `:12`) — the same
boundary described in clause (k).

AI path: `evaluateFactoryAiSwitchPolicy`
(`src/engine/factoryAiSwitchPolicy.ts:275`), the Factory port of source
`ShouldSwitch`, is called from `factoryAiLiveDriver.ts:63-65,377,448`, which
builds `kind: "switch"` at `:457` and submits via `submitBattleDecision` at
`:461`.

`npx vitest run tests/battleAiSwitchInto.test.ts
tests/factoryAiSwitchPolicy.test.ts` — **23 passed** (8 + 15).

## (h) Forced (post-faint) switching supported end-to-end

> "support voluntary and forced switching" (forced half)

**VERDICT: DISCHARGED**

`battleDecisionBoundary.ts:53` defines `kind: "forced-switch"`; `:590-593`
`createBattleForcedSwitchRequest`; `:682-689` validates a submitted decision
is `kind === "switch"` and `legalPartyIndexes.includes(decision.partyIndex)`,
rejecting otherwise (so an AI or player cannot force-switch to an illegal
slot).

Player menu path: `battlePartySelectStateForForcedParty`
(`src/engine/battlePartySelect.ts:62`), `createBattlePartySelectState`
(`:105-111`) filters to legal switch decisions;
`factoryRoundBattleOrchestrator.ts:1511-1539` routes the menu selection
through `submitBattleCommandPresentationDecision` into the same boundary.

`npx vitest run tests/battleScriptForceSwitchOpcode.test.ts
tests/battleScriptJumpifcantswitchOpcode.test.ts` — **24 passed** (11 + 13).

## (i) Round controller consumes real battle outcomes (post-#53 state)

> "The round controller consumes real battle outcomes rather than injected
> results."

**VERDICT: DISCHARGED**

`CompletedBattle` (`src/engine/roundController.ts:32-38`) does still exist
in production code by that name (confirmed: `grep -rn "CompletedBattle" src/`
→ only its own declaration, its one field use at `:57`, and its one
construction site at `:474`) — but it is `resolveRoundBattle`'s own internal
terminal-outcome record, not an injected fixture type. The only production
caller is `factoryRoundBattleOrchestrator.ts`'s `finishBattle` (`:722-784`):
`:727-728` hard-fails unless `battle.boundary.kind === "terminal"`;
`:743-749` derives the resolution via
`deriveBattleResolutionFromTerminalBoundary` from the real kernel's
`battle.rng.value`, `battle.boundary.outcome`, and
`battle.rules.rulesContext`; `:758` calls `resolveRoundBattle`. This is
genuine terminal-boundary consumption — the old ROADMAP:1161-1169
"executable-frontier reset" complaint ("`roundController.ts` still consumes
injected `CompletedBattle` fixtures") describes the pre-#53 state and no
longer matches current source.

Production wiring: `core.ts:377` — `appRoute: options.appRoute ??
"generated-orchestrator"` (default). Re-verified live during this audit:
`npx vitest run tests/roundController.test.ts
tests/roundControllerRentalPersistence.test.ts
tests/factoryRoundBattleOrchestrator.test.ts tests/interactiveRouting.test.ts
tests/battleDecisionBoundary.test.ts` — **79 passed** (17+3+30+15+14), 0
failed. `tests/interactiveRouting.test.ts:226` asserts
`createInitialState().appRoute === "generated-orchestrator"` directly.

Live-reverified oracle trace (re-run during this audit, not just cited from
PROGRESS): `npm run compare -- interactive-haunter-shadow-punch-off.json
--summary` → **`6/6 frames matched`**. Per-slice receipts, exact from
`PROGRESS-archive.md`:

| Entry | Slice | Receipt |
| --- | --- | --- |
| #737 | 1: route seam | `8dd8ebcf`; command 128/128; 25/25 immutable rows |
| #739 | 2: anchor session | `bd96c90a`; `accept-prebattle` 137/137; command 128/128 |
| #743 | 3: intro closed | intro 715/715; command entry 7/7; command 128/128 |
| #745 | 4: postwin/swap | 199/199, 216/216, 171/171, 164/164, 101/101 |
| #746 | 5: Battles 2-7 re-entry | swap exit/no-return 43/43 + 69/69 |
| #747 | 6: loss/win endings | 210/210 + 414/414 + 2513/2513 + 1911/1911 |
| #748→#749 | 7: production flip | HAUNTER 4/6 → **6/6** (RAM-cursor fix `671a8887`) |

One framing nuance (not a correctness gap): the design doc's "different-lead
ONIX Tier-1 proof" is a live in-suite assertion
(`tests/interactiveRouting.test.ts:294-309`, checks
`resolution.field.player.name === "ONIX"` and moveIds/PP through the same
`generated-orchestrator` route) rather than an independently named committed
trace file — no `interactive-*onix*.json` exists in
`tools/compare/traces/`. The underlying behavior is verified; only the
"named trace" framing in some prose descriptions overstates the artifact
shape.

## (j) Source-faithful AI test coverage

> "Source-faithful AI tests independently cover move limitations,
> per-script score changes, tie RNG, battle history and known-information
> behavior, switch/item selection, and every Factory challenge-policy
> branch."

**VERDICT: PARTIAL** (5 of 6 sub-items DISCHARGED; one sub-item OPEN)

1. **Move limitations / per-script score changes — DISCHARGED for the ported
   subset, PARTIAL for full table coverage.** Same evidence as clause (c):
   `factoryAiCheckBadMove.test.ts` (173 passed) and
   `factoryAiCheckViability.test.ts` (324 passed) exercise per-script score
   changes for the ~28+33 ported handlers; the remaining table entries are a
   named `unsupported-branch` barrier, not a test gap per se — but real
   engine breadth is still missing there (see clause (c)).
2. **Tie RNG — DISCHARGED.** `factoryAiDecisionPolicy.ts:381-385` (mask-0
   path) and `:1027-1031` (scored path) both draw `nextDraw(...,
   "best-move-tie-selection")` then `tieDraw.randomValue %
   bestMoveSlots.length`, matching source
   `consideredMoveArray[Random() % numOfBestMoves]`
   (`battle_ai_script_commands.c:445`, cited `docs/factory-ai-ground-truth.md:70,131`
   — drawn even for a lone winner, matching the source's unconditional
   draw). Live-oracle verified per `docs/factory-ai-ground-truth.md` §2.3
   (2-way tie) and §2.4 (4-way tie).
3. **Battle history / known-information — DISCHARGED for the wired subset.**
   `factoryAiLiveDriver.ts:129-243` ports `RecordAbilityBattle` /
   `RecordItemEffectBattle` / `RecordLastUsedMoveByTarget` and the
   switch-clears-history rule (`battle_main.c:3259-3261,3352-3354`) as
   `createFactoryAiBattleHistory` / `recordFactoryAiKnownAbility` /
   `recordFactoryAiKnownItemEffect` / `syncFactoryAiBattleHistory`. Covered
   by `tests/factoryAiR13dEvidence.test.ts` (10 passed), including a
   switch-clears-history assertion (`:397-455`). Item-effect history is
   tracked in the type but never populated in practice, which is correct
   per sub-item 4's source citation (item history is source-unreachable for
   Frontier battles), not a gap.
4. **Item selection — DISCHARGED as a source-faithful no-op, not a silent
   absence.** `factoryAiLiveDriver.ts:111-114` defines
   `FACTORY_AI_ACTION_GATE = {item:
   "frontier-trainer-items-source-unreachable"}`, citing
   `battle_ai_switch_items.c:280-309` (item history is never loaded for
   `BATTLE_TYPE_FRONTIER`). This is asserted, not merely declared:
   `tests/factoryAiLiveDriver.test.ts:258` and
   `tests/factoryWholeBattle.test.ts:158` both assert
   `result.actionGate === FACTORY_AI_ACTION_GATE`. No item-choice branch
   exists anywhere in `factoryAi*.ts`; `docs/factory-ai-boundary-audit.md:167-174,253-256`
   explicitly scopes it out as unreachable-by-source rather than
   unimplemented. **This is exactly the expected "source-faithful no-op
   proof" the task brief asked whether existed — it does.**
5. **Switch selection — DISCHARGED, with live-oracle receipts.**
   `factoryAiSwitchPolicy.ts` ports `ShouldSwitch` /
   `GetMostSuitableMonToSwitchInto` (`battle_ai_switch_items.c:20-525,528-595,629-790`).
   Its own header comment claiming it is "not wired to the live AI driver"
   is **stale** — commit `758d6794` ("Wire live Factory AI switch precheck")
   wires `evaluateFactoryAiSwitchPolicy` into `submitLiveFactoryAiDecision`
   (`factoryAiLiveDriver.ts:448-475`). `tests/factoryAiR13dEvidence.test.ts`
   reproduces exact RNG values from
   `docs/factory-ai-switch-receipts.md`/`-bc.md`/`-c.md` (e.g.
   `randomValue: 52937`, `rng.value: 0xcec9_a69f`) through the live driver,
   byte-for-byte. `docs/factory-ai-switch-receipts-c2.md` (Perish Song
   sentinel) has no live-driver equivalence test citing it by name — only a
   structural test at `tests/factoryAiSwitchPolicy.test.ts:192`. This is a
   minor remainder within an otherwise-discharged sub-item, not a reason to
   downgrade it.
6. **"Every Factory challenge-policy branch" — OPEN as a pinned artifact,
   though the underlying behavior is covered.** Mask selection is 5/5
   branch-tested (`tests/factoryAiPolicy.test.ts`, DISCHARGED). But
   `tests/executableFrontierRatchet.test.ts` (432 lines) contains **zero**
   Factory-AI barrier-count entries — the CBM (~100-entry) and CV
   (~90-handler) table-coverage inventory exists only as prose in file-header
   comments (`factoryAiCheckBadMove.ts:16-26`, `factoryAiCheckViability.ts:9-16`),
   not as an executable pin. Nothing regresses silently today only because
   no one has removed a handler; there is no test that would catch it if
   someone did. **Discharging artifact:** one small ratchet test (same shape
   as `PINNED_BARRIER_COUNTS`) enumerating `factoryAiCheckBadMove.ts` /
   `factoryAiCheckViability.ts` barrier call-site counts, so "every Factory
   challenge-policy branch" is a claim a regression test defends rather than
   a prose-only inventory.

## (k) Integration: AI returns only kernel-enumerated legal decisions, same submission boundary as player/test

> "Integration tests prove that the AI returns only a kernel-enumerated
> legal decision and enters through the same submission boundary as a player
> or test decision."

**VERDICT: DISCHARGED**

Single boundary: `submitBattleDecision` (`src/engine/battleDecisionBoundary.ts:776`).
Legality is enforced, not merely conventional: `:675-681` requires a command
decision to match `request.legalDecisions` by `decisionKey`; `:682-689`
requires a forced-switch decision to be in `request.legalPartyIndexes` — both
throw otherwise, and there is no bypass path.

Callers, all funneling through the same function:

- AI: `factoryAiLiveDriver.ts:461,509`.
- Player: `battleCommandPresentation.ts:469`, `partySelect.ts:525`,
  `factoryRoundBattleOrchestrator.ts:1612`
  (`submitFactoryRoundPlayerDecision`).
- Test/decision-policy paths:
  `factoryBattleScriptTerminalDecision.ts:838`,
  `factoryBattleScriptFullTurnDecision.ts:2114`,
  `factoryBattleScriptDecision.ts:733`,
  `factoryAiDecisionPolicy.ts:454,1093`.

Explicit intent comment at the AI's own call site
(`factoryRoundBattleOrchestrator.ts:1497-1499`): "A completed move choice
crosses the same `submitBattleDecision` bridge as every other battle
client." Test coverage for this boundary is included in the 79-test run
cited under clause (i) (`battleDecisionBoundary.test.ts` — 14 passed).

---

## Remainder worklist

Ranked by (1) whether it blocks Gate-5 closure, (2) estimated bounded-step
cost. Items are OPEN/PARTIAL findings only — (e), (f), (g), (h), (i), (k) are
fully DISCHARGED and need no further work for Gate 5.

1. **(d) Commentary ROM-verification trace — blocks Gate 5, small.** One
   explicit `battle-scene-off` staged commentary trace over a generated
   opponent party whose favorite type/style differ from canonical. Blocked
   only on staging a specific party (seed search, or a harness ask per
   PROGRESS entry 753's own conclusion) — the classification algorithm
   itself is already source-ported and unit-pinned. Est. 1 bounded step once
   the party-selection blocker clears; the blocker-clearing itself may need
   a small harness ask, not engine work.

2. **(a) Anchor-draft receipt link — blocks Gate 5 as literally stated,
   small.** One test that runs `generateInitialFactoryRentals` at the
   anchor's real RNG cursor (`0xd2ddeec8`) and asserts byte-identity with
   `src/data/gen/anchor-state.json`. Purely a test-authoring task; both
   sides of the equality already exist and are independently proven correct.
   Est. well under 1 bounded step.

3. **(j.6) Challenge-policy branch-coverage ratchet — blocks Gate 5 as
   literally stated, small.** Add a `PINNED_BARRIER_COUNTS`-style ratchet
   entry (or a sibling test) enumerating `factoryAiCheckBadMove.ts` /
   `factoryAiCheckViability.ts` barrier call sites, matching the existing
   pattern in `tests/executableFrontierRatchet.test.ts`. Documentation/test
   scaffolding only — no engine change required to discharge the letter of
   the clause, though see item 5 below for the underlying breadth.

4. **(c)/(j.1) Remaining AI_CheckBadMove/AI_CheckViability table breadth —
   arguably Gate-6 breadth in disguise, medium-large.** ~70+ CBM effects and
   ~55+ CV handlers remain behind named `unsupported-branch` barriers. Mask
   selection and the ported handlers are real and tested (542 passing
   tests across the three modules); this is the same "finite catalog,
   exhaustively enumerable" shape ROADMAP Gate 6 describes for moves/effects
   generally. Recommend the supervisor decide explicitly whether Gate 5's
   "run the native Factory AI" is satisfied by the current ported subset
   (with barriers as the documented boundary) or requires closing
   materially more of the table before Gate 5 can tick — this audit found
   no ROADMAP text drawing that line precisely, so it is a scope call, not
   a missing-artifact call.

5. **(b) Battles 3-7 opponent-identity oracle receipts — NOT a Gate-5
   blocker per ROADMAP's own S8 decision; flagged for completeness only.**
   ROADMAP.md:520-524 already declines sequential pixel/oracle verification
   of battles 3-7 as a matter of policy (deterministic scenarios/seeds
   instead of full-prefix replays). The generation algorithm is proven
   source-faithful and no-repeat logic is tested; only per-battle ROM
   receipts are absent, and the ROADMAP says that's expected. No action
   needed for Gate 5; note for Gate 6's broader receipt sweep if the
   supervisor wants one.
