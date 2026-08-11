# ISSUES #70 reachability pass: 47 unverified STRINGID resolver gaps

Answers ISSUES #70's "Next" step: of the 47 `STRINGID_*` refs `#68`'s insurance
sweep found in `src/engine/*.ts` whose placeholder(s) `battleResolutionPresentation.ts`'s
`messageLines` fallback cannot supply (the #65/#68-class completeness-guard crash,
`battleStringResolver.ts:129-172`'s `resolveBattleStringLines` throwing on an
unresolved `{TOKEN}`), which can a **currently-registered opcode/reducer actually
emit at runtime in Factory L50 singles** — traced through real code paths, not
doc-comment citations. Evidence-only; no production changes.

## Method

Two real ways a `STRINGID_*` reaches `messageLines()`:

1. **`printfromtable`** (`Cmd_printfromtable`, `battleScriptHitChainOpcode.ts:4041-4096`,
   installed as `B_SCR_OP_PRINTFROMTABLE` at `battleScriptHitChainOpcode.ts:4668`,
   confirmed present in the production dispatch composition
   `createBattleScriptStatusRulesHandlers`, `battleScriptRulesContext.ts:2890-2903`
   → wired into the live rules context at `battleScriptRulesContext.ts:3057`).
   It resolves `PRINTFROMTABLE_TABLES[<table pointer>][rulesContext.multistringChooser]`
   to a literal `STRINGID_*` and feeds it, unconditionally, to `prepareMessage`
   (`battleScriptHitChainOpcode.ts:4065-4086`). 41 of the 47 ids are literal
   entries in `PRINTFROMTABLE_TABLES` (`battleScriptHitChainOpcode.ts:330-519`).
   Reachability then reduces to two sub-questions per id: (i) is the *table's
   own* `printfromtable` call site wired (yes for every table used below — none
   of the owning scripts hit an `unsupportedBranch`), and (ii) is the specific
   *array index* ever actually written to `multistringChooser` by real,
   non-barriered logic (traced per id below — this is where the doubles-only
   and level-tie zero-incidence findings come from).
2. **Direct `printstring`/`attackstring`/`resultmessage`/`healthbarupdate`
   literal operand** — a handful of ids (`SUBSTITUTEDAMAGED`, `PKMNENDUREDHIT`,
   `HITXTIMES`, the `MISS_STRING_ID_BY_TYPE` family) are constructed as a bare
   `stringOperand(...)`/`{kind:"string", stringId:...}` literal inside an
   opcode handler rather than a table array. Same reachability question, one
   level up: is the handler that constructs the literal itself on a
   non-barriered path.

`prepareMessage`'s **production** implementation
(`factoryBattleScriptFullTurnDecision.ts:736-774`, the reducer actually driving
Factory full-turn decisions) accepts **any** `STRINGID_`-prefixed operand
unconditionally — it does not itself gate on a whitelist. So once a script
reaches a `printstring`/`printfromtable`/`attackstring`/`resultmessage`/
`healthbarupdate` instruction with one of these ids as its resolved operand,
the message event **will** be emitted and **will** hit `messageLines()`'s
generic fallback (`battleResolutionPresentation.ts:657-700`, which only
supplies `B_ATK_NAME_WITH_PREFIX`/`B_EFF_NAME_WITH_PREFIX`/
`B_SCR_ACTIVE_NAME_WITH_PREFIX`/`B_LAST_ITEM`) or a specific case
(none of these 47 have one) — and crash, per #68's own sweep premise, which
this pass does not re-verify.

`tools/report/executable-frontier-census.ts`'s output
(`docs/executable-frontier-census.md`, regenerable) independently confirms
100% of the 214 effect scripts are opcode-reachable today (no missing-opcode
blockers), which is corroborating evidence that the specific setter logic
traced below is not the exception — every multi-string-chooser setter checked
turned out to be real, dispatched code, not a stub.

**Incidence data, two sources, kept separate:**
- **"weighted N/850"** — `docs/executable-frontier-census.md`'s own
  per-effect `Factory-L50 moves (weighted)` column (rental-mon-count-weighted
  across the 850-set boundary already computed by that tool from
  `battle-script-topology.json`'s `level50FactoryReachableEffects` join).
  Reused verbatim, not recomputed.
- **"N/882 rental-mon entries"** — this pass's own quick census over
  `src/data/gen/battle-frontier-mons.json`'s 882 `FRONTIER_MON_*` catalog
  entries (species + moves + held item; not filtered to the exact 850-legal
  boundary), used only where the trigger is an **ability** or **held item**
  (no move-effect join exists for those in the committed topology). Ability
  incidence is species-level ability-slot presence, an upper bound (a species
  with two possible abilities is counted once per matching ability regardless
  of which slot the specific rental instance actually carries) — flagged
  inline everywhere it's used.

## 1–2. Per-id classification (47 ids)

Legend: **(a)** EMITTABLE, **(b)** REFERENCE-ONLY / dead wiring, **(c)**
BARRIER-GATED. "Table idx" cites the `PRINTFROMTABLE_TABLES` entry
(`battleScriptHitChainOpcode.ts:330-519`) where applicable.

| # | STRINGID | Class | Emitting site | Trigger / setter | Incidence |
|---|---|---|---|---|---|
| 1 | `PKMNENERGYDRAINED` | (a) | `gAbsorbDrainStringIds[0]`, `battleScriptHitChainOpcode.ts:483` | Default `multistringChooser` (0) whenever an Absorb-family hit lands and the target isn't Liquid Ooze (idx1 only reachable via `ABILITY_LIQUID_OOZE`, registered in `JUMPIFABILITY_VALUES`, `battleScriptIngrainLeechSeedWrapOpcode.ts:380-394`) — EFFECT_ABSORB is executable per census | **weighted 43/850** (Absorb/Mega Drain/Giga Drain) |
| 2 | `PKMNPOISONEDBY` | (a) | `gGotPoisonedStringIds[1]`, `:387` | `applySetMoveEffect`'s `B_MSG_STATUSED_BY_ABILITY` branch, `:3410`, gated by `HITMARKER_STATUS_ABILITY_EFFECT` set at `battleScriptMoveEndOpcode.ts:607` for `ABILITY_POISON_POINT` (`:598-601`) | Poison Point: **18/882** species-level |
| 3 | `PKMNBURNEDBY` | (a) | `gGotBurnedStringIds[1]`, `:388` | same mechanism, `ABILITY_FLAME_BODY` (`battleScriptMoveEndOpcode.ts:600-601`) | Flame Body: **8/882** |
| 4 | `PKMNFROZENBY` | (a) | `gGotFrozenStringIds[1]`, `:389` | same mechanism — no real ability sets `MOVE_EFFECT_FREEZE` via this path in vanilla (freeze isn't a contact-ability outcome); wiring is real and generic (any `MOVE_EFFECT_FREEZE` + ability-effect hitmarker), but no rental ability actually drives it | **0** realistic (freeze-on-contact isn't a Gen3 ability) — code path exists, never selected |
| 5 | `PKMNWASPARALYZEDBY` | (a) | `gGotParalyzedStringIds[1]`, `:390` | same mechanism, `ABILITY_STATIC` (`:599-600`) + Effect Spore roll (`:588-595`, folds burn into paralysis, a ported Gen3 quirk) | Static: **27/882**; Effect Spore: **8/882** (paralysis-branch only, 2 of its 3 rolls) |
| 6 | `PKMNPREVENTSPOISONINGWITH` | (a) | `gPSNPreventionStringIds[0]`, `:391-395` | `applySetMoveEffect`'s `preventionCall("BattleScript_PSNPrevention", ...)` (`:3378-3386`), `ABILITY_IMMUNITY` registered (`JUMPIFABILITY_VALUES`) | Immunity: **10/882** |
| 7 | `PKMNSXPREVENTSYSZ` | (a) | idx1 of all three PSN/BRN/PRLZ prevention tables, `:391-405` | same `preventionCall`, "already-revealed ability" variant | Immunity(10)+Water Veil(9)+Limber(5) = **24/882** combined |
| 8 | `PKMNSXHADNOEFFECTONY` | (a) | idx2 of the same three tables | same `preventionCall`, type-immune (Poison/Steel vs Toxic, `:3381-3387`) or already-known-ability tail | same ability pool, **24/882** |
| 9 | `PKMNSXPREVENTSBURNS` | (a) | `gBRNPreventionStringIds[0]`, `:396-400` | `ABILITY_WATER_VEIL` registered (`JUMPIFABILITY_VALUES`) | Water Veil: **9/882** |
| 10 | `PKMNPREVENTSPARALYSISWITH` | (a) | `gPRLZPreventionStringIds[0]`, `:401-405` | `ABILITY_LIMBER` registered | Limber: **5/882** |
| 11 | `USINGITEMSTATOFPKMNROSE` | (a) | `gStatUpStringIds[4]`, `:412-418` | `BattleScript_BerryStatRaiseDoStatUp` (Liechi/Salac/Petaya/etc. 25%-HP stat berries; census EFFECT-family doc comment `:406-411`) | not separately computed this pass — held-item-triggered, bounded follow-up |
| 12 | `PKMNCANTSLEEPINUPROAR2` | (a) | `gUproarAwakeStringIds[0]`, `:426-431` | `createJumpifcantmakeasleepOpcodeHandler`, `battleScriptStatusPrimaryOpcode.ts:201-234`, target itself is the Uproar battler | EFFECT_UPROAR weighted **1/850** (only if the AI itself carries Uproar) |
| 13 | `UPROARKEPTPKMNAWAKE` | (a) | `gUproarAwakeStringIds[1]` | same handler, a *different* battler is mid-Uproar while this one is the sleep-move target | same **1/850** Uproar-carrier gate |
| 14 | `PKMNSTAYEDAWAKEUSING` | (a) | `gUproarAwakeStringIds[2]`, `:427-431` | same handler, `ABILITY_INSOMNIA`/`ABILITY_VITAL_SPIRIT` branch (`battleScriptStatusPrimaryOpcode.ts:235-245`), independent of any Uproar carrier | Insomnia(15)+Vital Spirit(6) = **21/882** |
| 15 | `PKMNSITEMCUREDPROBLEM` | (a) | `gBerryEffectStringIds[0]`, `:437-441` | Two independent live call sites: end-of-turn `battleEndTurnOrchestration.ts:1283-1298` (`HOLD_EFFECT_CURE_STATUS`/`CURE_ATTRACT`) and mid-battle post-hit `battleScriptMoveEndOpcode.ts:762-825` (`BattleScript_BerryCureXRet` family) | Cheri/Rawst/Pecha/Persim/Chesto/Lum/Mental Herb combined: **201/882** |
| 16 | `PKMNSQUEEZEDBYBIND` | (a) | `gWrappedStringIds[0]`, `:491-499` | `battleScriptHitChainOpcode.ts:3692-3727`, index = `TRAPPING_MOVES.indexOf(currentMove)` (`:295`) — BIND | EFFECT_TRAP weighted **14/850** total (5 legal moves) |
| 17 | `PKMNWRAPPEDBY` | (a) | idx1 — WRAP | same mechanism | same pool |
| 18 | `PKMNTRAPPEDINVORTEX` | (a) | idx2 & idx4 — FIRE_SPIN / WHIRLPOOL (share text, matches vanilla `gWrappedStringIds`) | same mechanism | same pool |
| 19 | `PKMNCLAMPED` | (a) | idx3 — CLAMP | same mechanism | same pool |
| 20 | `PKMNTRAPPEDBYSANDTOMB` | (a) | idx5 — SAND_TOMB | same mechanism | same pool |
| 21 | `PKMNSTOCKPILED` | (a) | `gStockpileUsedStringIds[0]`, `:341-345` | `battleScriptStockpileOpcode.ts:60-85`, real dispatch | EFFECT_STOCKPILE weighted **2/850** |
| 22 | `PKMNHPFULL` | (a) | `gSwallowFailStringIds[1]`, `:351-355` | `battleScriptStockpileOpcode.ts:140-166`, Swallow at full HP | EFFECT_SWALLOW weighted **2/850** |
| 23 | `PKMNMADESLEEP` | (a) | `gFellAsleepStringIds[1]`, `:356-360` | ability-caused sleep-onset variant of the same status-write quartet (`applySetMoveEffect`, `MOVE_EFFECT_SLEEP`) — no rental ability inflicts sleep on-hit in vanilla Gen3 (only status *moves* do, which use idx0, not in the 47) | **0** realistic — wiring generic/real, no rental trigger exists |
| 24 | `PKMNOBTAINEDX` | (a) | `gItemSwapStringIds[0]`, `:369-374` | `battleScriptTryswapitemsOpcode.ts:180-215` (Trick), `B_MSG_ITEM_SWAP_TAKEN` | EFFECT_TRICK weighted **5/850** |
| 25 | `PKMNOBTAINEDX2` | (a) | idx1, `B_MSG_ITEM_SWAP_GIVEN` | same handler | same **5/850** |
| 26 | `PKMNOBTAINEDXYOBTAINEDZ` | (a) | idx2, `B_MSG_ITEM_SWAP_BOTH` | same handler, both sides held an item | same **5/850** |
| 27 | `PKMNCHOSEXASDESTINY` | (a) | `gFutureMoveUsedStringIds[1]`, `:379-382` | `battleScriptTrysetfutureattackOpcode.ts:129-165`, `multistringChooser = 1` iff `currentMove === MOVE_DOOM_DESIRE` (`:165`) | **0/882** — `MOVE_DOOM_DESIRE` never appears in `battle-frontier-mons.json` (Jirachi-exclusive, not a legal Factory rental) |
| 28 | `PKMNEVADEDATTACK` | (a) | `gLeechSeedStringIds[1]`, `:468-475` | `battleScriptIngrainLeechSeedWrapOpcode.ts:~95-118`, Leech Seed missing | EFFECT_LEECH_SEED weighted **12/850** |
| 29 | `PKMNSEEDED` | (a) | idx0 | same handler, Leech Seed hitting | same **12/850** |
| 30 | `PKMNPROTECTEDITSELF` | (a) | `MISS_STRING_ID_BY_TYPE[1]`, `:220-221`, via `Cmd_resultmessage` (`:2666-2725`) | `missType = B_MSG_PROTECTED` set at `battleScriptHitChainOpcode.ts:1049,1111` and `battleScriptAttackCancelerOpcode.ts:305`, fires against **any** attacking move a Protect/Detect use blocks | EFFECT_PROTECT weighted **37/850** — fires once per successful Protect against whichever move the AI/player throws next, so realized incidence over a 7-battle set is higher than the raw carrier count |
| 31 | `PKMNAVOIDEDATTACK` | (a) | `MISS_STRING_ID_BY_TYPE[2]` | `missType = B_MSG_AVOIDED_ATK` at `:1224` (Wonder-Guard-style double-avoid tail) | not separately computed — shares the `resultmessage` dispatch above |
| 32 | `AVOIDEDDAMAGE` | (a) | `MISS_STRING_ID_BY_TYPE[3]` | `missType = B_MSG_AVOIDED_DMG` at `:988,1677,1823` (semi-invulnerable Fly/Dig turn, type-immune avoid) | Fly/Dig-family carriers exist in the rental pool; not separately counted this pass |
| 33 | `PKMNMAKESGROUNDMISS` | (a) | `MISS_STRING_ID_BY_TYPE[4]` | `missType = B_MSG_GROUND_MISS` at `:959,1622,1783` (Levitate / Ground-move-vs-Flying) | Levitate carriers exist in the rental pool; not separately counted this pass |
| 34 | `PKMNRAISEDDEF` | (a) | `gReflectLightScreenSafeguardStringIds[1]`, `:458-465` | `createSetSideStatusHandler(REFLECT_CONFIG)`, `battleScriptSetSideStatusOpcode.ts:119-129,238`, `successChooser = B_MSG_SET_REFLECT_SINGLE` | Reflect weighted **16/850** |
| 35 | `PKMNRAISEDDEFALITTLE` | (a), **zero-incidence** | idx2 | `B_MSG_SET_REFLECT_DOUBLE` — the file's own header comment (`battleScriptSetSideStatusOpcode.ts:14-19`) states this chooser value is "genuinely unreachable at Factory L50 singles... always the SINGLE chooser value on success," gated on `BATTLE_TYPE_DOUBLE && CountAliveMonsInBattle(...)==2` | **0** — structurally never selected in singles, not a barrier (dispatch is source-complete) |
| 36 | `PKMNRAISEDSPDEF` | (a) | idx3 | `LIGHTSCREEN_CONFIG`, `successChooser = B_MSG_SET_LIGHTSCREEN_SINGLE` | Light Screen weighted **23/850** |
| 37 | `PKMNRAISEDSPDEFALITTLE` | (a), **zero-incidence** | idx4 | `B_MSG_SET_LIGHTSCREEN_DOUBLE`, same doubles-only exclusion as #35 | **0** |
| 38 | `PKMNCOVEREDBYVEIL` | (a) | idx5 | `SAFEGUARD_CONFIG`, `successChooser = B_MSG_SET_SAFEGUARD` | Safeguard weighted **7/850** |
| 39 | `PKMNSHROUDEDINMIST` | (a), **zero-incidence** | `gMistUsedStringIds[0]`, `:466-467` | `MIST_CONFIG`, same `createSetSideStatusHandler` family, opcode registered (`B_SCR_OP_SETMIST`, `:241`) | EFFECT_MIST weighted **0/850** — no legal L50 rental carries Mist |
| 40 | `PKMNTRANSFORMEDINTO` | (a), **zero-incidence** | `gTransformUsedStringIds[0]`, `:331-335` | `battleScriptTransformOpcode.ts:50-99`, fully wired | EFFECT_TRANSFORM weighted **0/850** — no legal L50 rental carries Transform |
| 41 | `PKMNRAISEDFIREPOWERWITH` | (a) | `gFlashFireStringIds[0]`, `:484-488` | `battleScriptHitChainOpcode.ts:904-925`, `ABILITY_FLASH_FIRE` + `TYPE_FIRE` hit, first activation | Flash Fire: **25/882** |
| 42 | `PKMNSXMADEYINEFFECTIVE` | (a) | idx1 | same handler, `alreadyBoosted` (`flashFireBoosted===1`) re-activation | same **25/882** |
| 43 | `PKMNUNAFFECTED` | (a), **zero-incidence** | `gKOFailedStringIds[1]`, `:500-501` | `battleScriptTryKOOpcode.ts:44-48,156-175`: `B_MSG_KO_UNAFFECTED` iff `targetLevel > attackerLevel` — the opcode's own doc comment (`:31`) states levels "are almost always equal under this engine's Level-50 Factory singles scope" | **0** in mirror-level L50 singles (both battlers always level 50 → the level clause never fires); code path fully wired for a contrived level mismatch |
| 44 | `PKMNENDUREDHIT` | (a) | direct literal, `classifyResultMessage`, `battleScriptHitChainOpcode.ts:2603,2611-2612`, via `Cmd_resultmessage` | `MOVE_RESULT_FOE_ENDURED` bit set at `:2010,2123` (real, both paths), requires target used Endure and the hit would otherwise KO | EFFECT_ENDURE weighted **24/850** |
| 45 | `SUBSTITUTEDAMAGED` | (a) | direct literal, `Cmd_healthbarupdate`, `battleScriptHitChainOpcode.ts:2326-2367`, line 2354 | fires on **every** damaging hit landed on a battler with an active Substitute (opcode `B_SCR_OP_HEALTHBARUPDATE` registered, `:4661`) | EFFECT_SUBSTITUTE weighted **10/850** carriers; each carrier's Substitute can absorb multiple hits per use, so realized trigger count exceeds the raw carrier weight |
| 46 | `HITXTIMES` | (a) | direct literal — the `printstring STRINGID_HITXTIMES` instruction itself is real script *data* (not a TS literal), sitting immediately after the `copyarray gBattleTextBuff1, sMULTIHIT_STRING, 6` step that `battleScriptIngrainLeechSeedWrapOpcode.ts:308-323` explicitly documents and dispatches as a real `advance` (not a barrier) — "found live this session, on the multi-hit family's normal happy path" (`:308-311`) | Any multi-hit move (Double Slap/Comet Punch/Fury Attack/Pin Missile/Spike Cannon/Barrage) completing its hit sequence; `B_SCR_OP_PRINTSTRING`/`attackstring` dispatch is the same generic, registered path as every other id here | EFFECT_MULTI_HIT weighted **9/850** |
| 47 | `PKMNSXCUREDITSYPROBLEM` | **(b) REFERENCE-ONLY / unimplemented** | only occurrence is the `prepareMessage` substitution-mapper's own dead branch, `factoryBattleScriptFullTurnDecision.ts:747-748` | Real source mechanic: `BattleScript_AbilityCuredStatus` (`reference/pokeemerald/data/battle_scripts_1.s:4214-4218`, `printstring STRINGID_PKMNSXCUREDITSYPROBLEM` verbatim), fired from `AbilityBattleEffects`'s Insomnia/Water Veil/Magma Armor/Oblivious auto-cure-on-ability-activation block (`reference/pokeemerald/src/battle_util.c:2900-2946`) — **no code path in this engine ever calls or models that block**; `battleScriptSwitchinOpcode.ts:108-129`'s `ABILITY_SYMBOLS` is a flat id↔name table, not this mechanic. The substitution branch was added defensively (anticipating a future emitter) but nothing emits it today | **0** — dead wiring, not a barrier (no `unsupportedBranch` call exists for this; the mechanic simply isn't ported) |

**Sum check:** 46 classified (a) + 1 classified (b) + 0 classified (c) = **47/47**, no
remainder. 6 of the 46 (a) entries have **zero real-world incidence** at Factory
L50 singles specifically (`PKMNRAISEDDEFALITTLE`, `PKMNRAISEDSPDEFALITTLE`,
`PKMNSHROUDEDINMIST`, `PKMNTRANSFORMEDINTO`, `PKMNCHOSEXASDESTINY`,
`PKMNUNAFFECTED`) plus 2 more where the ability/effect wiring is real but no
rental carrier exists in vanilla Gen3 (`PKMNFROZENBY`, `PKMNMADESLEEP`) — all 8
are still correctly (a) per the brief ("an id emitted only by a move no rental
set carries is (a) but zero-incidence"), just not real crash risks today.

## Ranked top-N by crash risk (brief-ready)

Ranked by realized incidence over a 7-battle Factory set, not raw carrier
count, per the brief's own reasoning (a crash the AI can trigger every few
battles outranks one needing a rare chain).

| Rank | STRINGID(s) | Trigger scenario | Incidence |
|---|---|---|---|
| 1 | `PKMNENERGYDRAINED` | AI or player uses an Absorb-family move (Absorb/Mega Drain/Giga Drain) and it lands on a non-Liquid-Ooze target | weighted 43/850 |
| 2 | `PKMNPROTECTEDITSELF` (+`PKMNAVOIDEDATTACK`/`AVOIDEDDAMAGE`/`PKMNMAKESGROUNDMISS` share the same `resultmessage` dispatch) | A Protect/Detect carrier (37/850 weighted) successfully blocks literally any incoming attack — very likely to occur at least once in a 7-battle set | weighted 37/850, fires per successful block |
| 3 | `PKMNPOISONEDBY` / `PKMNBURNEDBY` / `PKMNWASPARALYZEDBY` | Attacker makes contact with a Static(27)/Poison Point(18)/Flame Body(8)/Effect Spore(8) holder and the ability's status roll fires | ~61/882 combined ability-holder count (species-level) |
| 4 | `PKMNSITEMCUREDPROBLEM` | A status-cure-berry holder (Cheri/Rawst/Pecha/Persim/Chesto/Lum/Mental Herb) either resists an inflicted status immediately or cures it end-of-turn | 201/882 rental entries hold a matching berry |
| 5 | `PKMNENDUREDHIT` | An Endure carrier (24/850 weighted) takes a hit that would otherwise KO it | weighted 24/850 |
| 6 | `SUBSTITUTEDAMAGED` | Any damaging hit lands on a battler with an active Substitute (10/850 weighted carriers, but each absorbs multiple hits per use) | weighted 10/850 carriers, multi-fire per use |
| 7 | `PKMNRAISEDDEF`/`PKMNRAISEDSPDEF`/`PKMNCOVEREDBYVEIL` | Reflect(16)/Light Screen(23)/Safeguard(7) cast successfully | weighted 46/850 combined |
| 8 | `HITXTIMES` | A multi-hit move (Double Slap/Comet Punch/Fury Attack/Pin Missile/Spike Cannon/Barrage) completes its hit sequence | weighted 9/850 |

Rows 1–6 are brief-ready as-is (trigger scenario, emitting function, condition
all cited above) for a fix worker to pick up verbatim.

## 3. The 4 missing-table ids

None of these are genuine `STRINGID_*` extraction gaps except one:

- **`STRINGID_INTROSENDOUT`** — the one real gap. It's a genuine macro
  (`reference/pokeemerald/include/constants/battle_string_ids.h:5`, id=1), but
  `tools/extract/extract-battle-messages.ts`'s own header comment
  (`:6-19`) explicitly scopes `stringTable` to
  `STRINGID_x (x >= BATTLESTRINGS_TABLE_START=12)` and special-cases only id 4
  (`STRINGID_USEDMOVE`) as `usedMoveTemplate`; ids 0/1/2/5
  (`INTROMSG`/`INTROSENDOUT`/`RETURNMON`/`BATTLEEND`) are called out by name as
  "out of this extractor's scope" because `BufferStringBattle`
  (`reference/pokeemerald/src/battle_message.c:2034+`) dispatches them via a
  hand-written switch with flag-dependent branching (`BATTLE_TYPE_DOUBLE`/
  `INGAME_PARTNER`/`TWO_OPPONENTS`/`MULTI`, wild-vs-trainer, ...), not a flat
  one-row-per-id template lookup — the same reason `STRINGID_SWITCHINMON`
  (id=3) already has a hand-ported literal-string implementation in
  `messageLines()` (`battleResolutionPresentation.ts:637-656`) instead of a
  table entry. **Bounded fix (not implemented):** add a small hand-mapped
  table for ids 0/1/2/5 parsed from `BufferStringBattle`'s switch arms, the
  same way `SWITCHINMON`'s English strings were derived by hand — not a
  range-widen, since the rest of the extractor's `[id - BATTLESTRINGS_TABLE_START]`
  indexing assumes the 12+ contiguous range.

- **`STRINGID_FAINTED`** — not a real macro (`battle_string_ids.h` has no such
  symbol; only `STRINGID_ATTACKERFAINTED`=28 and `STRINGID_TARGETFAINTED`=29,
  both already extracted and already specifically handled in `messageLines()`,
  `battleResolutionPresentation.ts:611-636`). The sweep's regex matched
  informal comment prose ("same `STRINGID_FAINTED` template...", `battleScene.ts:15156-15157,16781-16782`),
  not a real symbol. No extractor fix needed.

- **`STRINGID_ITEMHEALHP_BERRY`** — not a real macro anywhere in the pinned
  reference source. The comment (`battleScene.ts:10496-10497`, "ONIX's SITRUS
  BERRY\nrestored health!") is informal shorthand for the real, already-extracted
  id `STRINGID_PKMNSITEMRESTOREDHEALTH` (298; template
  `"{B_SCR_ACTIVE_NAME_WITH_PREFIX}'s {B_LAST_ITEM}\nrestored health!"` —
  verbatim match). Also not one of the 47 (its placeholders are already
  covered by the generic fallback, `battleResolutionPresentation.ts:682-698`).
  No extractor fix needed.

- **`STRINGID_USEDMOVE_OPERAND`** — not a `STRINGID_*` game symbol; it's a
  local TS constant name (`battleScriptHitChainOpcode.ts:1248-1254`) for a
  synthetic operand object whose `.expression` field is the literal string
  `"STRINGID_USEDMOVE"` (the real, already-extracted id 4, handled specially
  at `battleResolutionPresentation.ts:445-464`). The sweep's `STRINGID_[A-Z0-9_]+`
  regex matched the TS identifier's own name, not a battle-string symbol. No
  extractor fix needed.

**Sum check:** 1 real gap (`INTROSENDOUT`) + 3 sweep-regex false positives
(`FAINTED`, `ITEMHEALHP_BERRY`, `USEDMOVE_OPERAND`) = **4/4**, no remainder.

## Caveats

- Ability-holder incidence (`N/882`) is species-level ability-slot presence
  across the raw `battle-frontier-mons.json` catalog, not the exact 850-legal-set
  weighting the census computes for moves — no committed ability↔Factory-L50
  join exists yet to do the equivalent weighting cheaply. Treat as an
  upper-bound approximation, not an exact figure.
- Rows 31–33 (`PKMNAVOIDEDATTACK`/`AVOIDEDDAMAGE`/`PKMNMAKESGROUNDMISS`) and
  row 11 (`USINGITEMSTATOFPKMNROSE`) confirm the emitting path is real and
  wired but stop short of computing incidence — bounded follow-up work, not a
  reachability gap.
- This pass does not re-verify #68's own placeholder-need claim (that each of
  the 47's templates needs a placeholder the generic fallback can't supply);
  it takes that as given per the ticket and only traces reachability.
