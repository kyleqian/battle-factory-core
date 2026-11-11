# dia269: root causes for the remaining ROM-driver divergences (diagnosis; no `src/` or `tests/` change)

Evidence (ignored): `.integration/evidence/dia269/` (`SEED-on.*` baseline drives, `SEED-ailog.jsonl` engine AI decision logs, `SEED-draws*.json` ROM per-Random() logs, `SEED-fx.*` chains re-run on a scratch tree).
Recipe: `tools/audio/romDriveSeed.sh SEED on .integration/evidence/dia269`. Tuple = `[frame, gCurrentMove, hp0, hp1, rng, lastMove0, lastMove1]`. RNG draw counts were measured with the pokeemerald LCG (`rng' = rng*1103515245 + 24691`) by single-stepping per `Random()` (ROM rows are per frame, so several draws can hide in one row).
"Scratch-fixed" = a copy of the tree in `/tmp` with the patch shown below; the worktree `src/` is untouched. Precedent: `docs/dia263-leads.md`; driver: `docs/aud243d-rom-driver.md`.

## Summary table

| seed | baseline matched/total (engine rows) | first divergence (engine row vs ROM) | cause | confidence | scratch-fixed |
|---|---|---|---|---|---|
| 22 | 8/21 | row 8, f5900: engine AI picks a move the ROM scored -10 (Ground vs Rock/Flying not x0 in AI) | A: CBM x0 check uses the true multiplier, not the AI quirk | high | 10/10 full match |
| 30 | 6/12 | row 6, f4873: engine consumes 13 RNG draws for the decision, ROM 12 (looked like a lastMove difference) | B: `if_target_faster` omits paralysis (attacker speed /4) | high | 11/11 full match |
| 39 | 9/12 | row 9, f6537: AI damage ranking differs (TryToFaint) | C: AI damage sim drops species/hold-effect terms (Choice Band, type boost, Thick Club) | high | 11/11 full match |
| 53 | 4/10 | row 4, f2334: engine ends turn with a different effect byte; ROM KOs, differing opponent hp / recoil | D: stale `gBattleCommunication[MOVE_EFFECT_BYTE]` leaks across turns in engine | high | not re-run (no time) |
| 42 | 9/17 | row 9, f6327: ROM opponent KO'd earlier in turn; rng differs | E: speed-tie GWSF draw / `gRandomTurnNumber` draw count (end-turn ordering) | medium-high | not re-run |
| 57 | 6/12 | row 6, f4408: engine opp plays Brick Break, ROM Megahorn | unconfirmed (damage ranking in TryToFaint) | candidates only | no change (6/12) |
| 50 | 18/26 | row 18, f11307: ROM opp hp1 = 25, engine 144 (different move/damage after lastMove0 = 80) | unconfirmed, not isolated | low | not run |
| 60 | 36/83 | row 36, f24695: "party menu without a switch decision" (decision-shape) | unconfirmed, only the drive summary was read | low | 36/83 (the A/B/C patches do not move it) |

Seeds 22, 30, 39 are ISSUES #204 remainder (AI scoring); 42, 50, 53, 57, 60 are from `docs/aiv267-ai-screens-self-hit.md` section 7.
Un-examined: 50 and 60 (above), the Scene OFF variants of every seed, seeds 41..60 other than the five listed, and the opponent-side effect of fixes A/B/C on seeds 1..21 (no regression run was done: no test suite or soak was allowed in this step).

## A. Seed 22: CBM "negates type" uses the true multiplier, not the AI-effectiveness quirk (high)

- ROM: `AI_CheckBadMove` (`data/battle_ai_scripts.s` ~52-62) runs `if_type_effectiveness AI_EFFECTIVENESS_x0` through `Cmd_if_type_effectiveness` (`battle_ai_script_commands.c:1515-1557`). Non-BUGFIX quirk: starts at 40, `TypeCalc`/`ModulateDmgByType` (`battle_script_commands.c:1536-1591`, `:1321`) modulate in TABLE order; the x0 row sets 0, but the next table row with a non-zero multiplier lifts it (clamp 0 back to 1), and the no-effect flag is never copied. Result: Ground vs Rock/Flying is NOT x0 in the AI's view, so the move is not scored -10 and the two `get_ability` guesses (2 draws per move) are consumed differently.
- Engine: `src/engine/factoryAiCheckBadMove.ts:1308` computes `typeMultiplierTenths(move.type, target.types)` (`:1258`, the true multiplier) and treats 0 as x0; `computeAiEffectiveness` (`:2773`, table order, already quirk-faithful) is not used. Same family: the `!== 20` WonderGuard check at `:1330` and the helper at `:2708`.
- Observed: Ground move vs Rock/Flying: ROM keeps the move viable (+RNG), engine scores -10 and picks another move; the draw counts then differ and everything after diverges.
- Scratch patch that gives 10/10: at `:1308` use `const effectivenessTenths = typeMultiplierTenths(move.type, target.types); if (computeAiEffectiveness(move.type, target.types) === 0) {`. Equivalent: make the gating condition use `computeAiEffectiveness` and keep the true multiplier only for damage.
- Fix shape: route every AI "x0 / SE / NVE" test through `computeAiEffectiveness` (`:1308`, `:1330`, `:2708`); keep `typeMultiplierTenths` for real damage only.
- Test idea: `AI_CheckBadMove` with Ground attacker vs `[ROCK, FLYING]` must NOT return -10 and must consume the 2 `get_ability` draws; plus a Ground vs `[FLYING]` case (true x0, flag path) for contrast. Re-drive seed 22 ON expecting 21/21 rows.

## B. Seed 30: `if_target_faster` AI sites omit paralysis (high)

- ROM: `Cmd_if_target_faster` calls `GetWhoStrikesFirst` (`battle_main.c` ~4605-4660): speed terms are swift swim/chlorophyll, stat stage, Macho Brace /2, paralysis /4, Quick Claw gate (`gRandomTurnNumber`). Users: `AI_CV_Paralyze` (`data/battle_ai_scripts.s:1524-1534`) and `AI_TryToFaint` dse (`:2616-2627`).
- Engine: `src/engine/factoryAiCheckViability.ts:7359` `runCvParalyze` builds the `TurnOrderBattler` (~`:7370-7382`) with no `isParalyzed`. The same pattern recurs at `:1385-1406, 1522, 1621, 1960, 2514, 2593, 2684, 2805, 4809, 5275`. `src/engine/turnOrder.ts` ~`:44-68` `effectiveSpeed` already supports `isParalyzed`. `src/engine/factoryAiLiveDriver.ts:490` provides the target's `isParalyzed` but not the attacker's.
- Observed: the paralyzed AI mon is treated as faster, so engine and ROM take different `if_random_less_than` / target-faster branches; the engine does +13 draws vs the ROM's +12 for that decision (looked like a lastMove difference at row 7 but is a draw-count difference).
- Scratch patch (11/11): in each TurnOrderBattler literal add `isParalyzed: (input.attacker as any).isParalyzed === true` (and the same for the target), with the live driver passing the attacker flag.
- Fix shape: one shared `toTurnOrderBattler(view)` in the AI modules carrying paralysis, held item (Macho Brace), ability and stat stage; replace the 12 hand-built literals. Quick Claw / weather speed ability terms should be audited in the same pass.
- Test idea: `runCvParalyze` with attacker paralyzed and base speed above the target: `if_target_faster` must be true (target faster); same with Macho Brace. Re-drive seed 30 ON expecting 12/12.

## C. Seed 39: AI damage simulations drop species/hold-effect terms (high)

- ROM: `get_how_powerful_move_is` (`battle_ai_script_commands.c:1174-1236`) and `Cmd_if_can_faint` (`:1743`) use `AI_CalcDmg` + `TypeCalc` * simulatedRNG/100, which go through `CalculateBaseDamage` (`pokemon.c`): Choice Band, type-boost items, Thick Club (species), Light Ball, Deep Sea Tooth etc. `data/battle_ai_scripts.s:2616-2636` (`AI_TryToFaint`, ScoreUp4) consumes the ranking.
- Engine: `src/engine/factoryAiTryToFaint.ts` `estimateDamage` (`:122-155`; called at `:198` and `:227`) feeds `DamageBattler` (`src/engine/damageCalc.ts:100-125`, expects string `holdEffect`, `species`, `holdEffectParam`; type-boost loop `:323-332`, Choice Band `:337`, Thick Club `:367`). `src/engine/factoryAiLiveDriver.ts` ~`:375-430` builds the attacker view with a numeric `holdEffect` (so the string comparisons in `damageCalc.ts` never match), no `species`, no `holdEffectParam`. (`usablePartyMons` IS populated via `countUsablePartyMons` `:391/442`; the aiv267 note saying it is not is outdated.)
- Observed: the engine mis-ranks move damage, so the "strongest move" / can-faint branches differ and the pick diverges.
- Scratch patch (11/11): live driver adds `species: attacker.species, holdEffectParam: resolveBattleScriptBattlerHoldEffectParam(input.rulesContext, 1)` (`src/engine/battleScriptRulesContext.ts:1682, :1693`); `estimateDamage` maps numeric `holdEffect` through `HOLD_EFFECT_NAME_BY_ID` (`src/engine/battleScriptHitChainOpcode.ts:173`) and leaves the defender holdEffect null (scratch result matched the ROM; the defender-item handling was not independently checked against C).
- Fix shape: build the AI `DamageBattler` from the same resolver the real damage path uses, so hold effect/species/param cannot drift.
- Test idea: `estimateDamage` for a Choice Band / type-boost-item / Thick Club (Cubone, Marowak) attacker must equal `DamageBattler` damage for the same inputs at the same random factor. Re-drive 39 ON expecting 12/12.
- Note: seed 57 may share this module (see below), so fix C first and re-drive 57.

## D. Seed 53: stale `MOVE_EFFECT_BYTE` across turns (high)

- ROM: `gBattleCommunication[MOVE_EFFECT_BYTE]` is cleared at the start of each move's effect resolution (`battle_script_commands.c:2917-2937` for `SetMoveEffect`, `:3621-3628`; `data/battle_scripts_1.s:897-901`, `:3939-3950`; turn loop `battle_main.c:3932-3955`, `:3985-3986`). The ROM KOs the target (the diff is opponent hp/recoil, not "ROM does not KO" as aiv267 first read it).
- Engine: `src/engine/battleEndTurnOrchestration.ts:2431` and `:2443` (end-turn effect resolution reads the effect byte without re-clearing); `src/engine/battleScriptMoveValuesCommands.ts:17-46` and `src/engine/battleScriptHitChainOpcode.ts` ~`:4046-4084` where the byte is set/consumed. A leftover value from the prior move applies a secondary effect (recoil/status) on the next turn.
- Fix shape: clear the effect byte at the same points as C (before `attackcanceler`/`SetMoveEffect` entry and in the end-turn path); do not carry it through `battleEndTurnOrchestration`.
- Test idea: sequence a move with a secondary effect (e.g. recoil/flinch) followed by a plain damaging move next turn; assert no secondary effect on the second. Re-drive seed 53 ON.
- Not re-run on a scratch tree, so confidence is from reading code + the draw log, not a green chain.

## E. Seed 42: speed-tie draws / `gRandomTurnNumber` count at end of turn (medium-high)

- ROM: `GetWhoStrikesFirst` speed-tie `Random() & 1` (`battle_main.c:3956-3975`, `:4595`), `gRandomTurnNumber = Random()` per turn, `battle_util.c:638-644` and `:1199-1218` (ability/end-turn effect ordering).
- Engine: `src/engine/battleEndTurnOrchestration.ts:2215, 2762-2785, 2866-2882`, `src/engine/turnOrder.ts`, `src/engine/factoryBattleScriptFullTurnDecision.ts:2615-2665`.
- Observed: the ROM's opponent faints in an earlier row than the engine's (the engine plays the same turn another way) and the RNG after that turn is off by a draw. Candidate 1 (leading): the order of the speed-tie GWSF draw vs the `gRandomTurnNumber` draw differs when both mons have equal speed. Candidate 2: end-turn effect ordering (battle_util.c:1199-1218) consumes/skips a draw.
- Fix shape / test idea: unit test with equal-speed mons that asserts the exact draw sequence for one turn (GWSF tie, `gRandomTurnNumber`, accuracy, damage roll), then compare to the ROM `drawlog2.py` output for seed 42.
- Not re-run on a scratch tree.

## Seed 57 (unconfirmed): engine ranks Brick Break strongest, ROM ranks Megahorn

- Engine TTF log (`factoryAiTryToFaint.ts` `computeMostPowerful`): moveset `[224,89,157,280]` with simulated RNG `[87,89,95,96]` gives `moveDmgs [105,60,96,145]` (atk 189, stage 6, def 126, defender `[ICE, WATER]`, holdEffect 22, hp 201) so Brick Break (280) is "most powerful"; the ROM scores Megahorn (224) most powerful (ROM row-per-move `[100,99,99,99]`) and plays it.
- Candidate (a), leading: the engine's damage estimate for Bug vs Ice/Water or Fighting vs Ice/Water differs from `AI_CalcDmg` (type multiplier order, STAB, or the stat terms; fix C may be involved since the attacker holds an item, he = 22).
- Candidate (b): the simulatedRNG slot-to-move mapping (`factoryAiTryToFaint.ts:198`, which draw goes with which move slot) differs from `BattleAI_SetupAIData` (4 draws, moves 0..3), shifting which move gets the 96 roll.
- Needed to settle: a ROM-side per-move damage readout (`gBattleMoveDamage` after each `AI_CalcDmg`) at the first TTF decision; not available in the time box.
- Scratch A+B+C did not move seed 57 (6/12), so it is a distinct cause.

## Seeds 50 and 60 (unconfirmed)

- 50: 18/26. First divergence at f11307; the engine row has opponent hp1 144 and the ROM row 25 with lastMove0 = 80 on both sides, i.e. the exchange before that row dealt a very different damage, which points at a damage/accuracy/crit RNG difference in the preceding turn rather than a decision difference. Two candidates: (1) an AI-pick difference upstream (fixes A/B/C family, not tested on this seed); (2) a damage-path or end-turn effect difference (D/E family). Not isolated.
- 60: 36/83, long game. Divergence at f24695: ROM goes to the party menu without a switch decision on the engine side ("decision-shape"); the scratch A/B/C fixes leave 36/83 unchanged. Only the drive summary was read; a ROM-side look at why the party menu opened (forced switch after faint vs AI switch decision) is the next step.

## Ranking by confidence (what to fix first)

1. A (seed 22), B (seed 30), C (seed 39): all verified full-match on a scratch tree, independent of each other, each small and local to the AI modules. Apply in any order; they compose (all three scratch patches together were not re-run on 42/50/53/57/60 beyond 57/60 above).
2. D (seed 53): code-reading plus draw log, small fix.
3. E (seed 42): needs a one-turn draw-sequence test first.
4. 57, 50, 60: need ROM-side instrumentation before any fix.

## PAPERCUTS

- Seeds take ~1.5 min each to re-drive; there is no way to ask the ROM for per-move AI damage (`gBattleMoveDamage` after `AI_CalcDmg`) in the driver. A small ROM probe would close seed 57-style questions.
- `moves.json`-class data files are one-line JSON; `grep` on them dumps the whole file. Use `jq`/node.
- `docs/aiv267-ai-screens-self-hit.md` still says `usablePartyMons` is unpopulated in the live driver (it is populated, `factoryAiLiveDriver.ts:391/442`).
- The brief's generic closing line ("npm test and npm run build green") conflicts with this diagnosis-only step (no src change, no suite/build runs); it was not applicable.
