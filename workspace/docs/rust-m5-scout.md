# Rust M5 opener scout — Factory AI move-scoring leaf family

Written 2026-08-11 by a bounded rust-lane docs-only worker, for the next
`./run-supervisor.sh -l rust` session. **Recommendation: open M5 with
`factoryAiCheckBadMove.ts` + `factoryAiMaskSelection.ts`**, the two Factory
AI modules with zero non-leaf engine imports, then continue the same family
(`factoryAiCheckViability.ts`, `factoryAiTryToFaint.ts`,
`factoryAiDecisionPolicy.ts`) in dependency order across later steps.

## Candidates evaluated and rejected

- **`factorySwap.ts`** (439 lines, imports only `BattleMon`) — the decision
  logic (`applyFactorySwapMutation`, `factorySwapRoundDecision`) is real but
  is fused in the same reducer with VBlank-copy-delay presentation state
  (`cursorCopyPending`, `displayCursor`/`arrowCursor` lag,
  `inputReady`-gated phases) — not separable into a pure-math half. Its only
  consumers are `factorySwapPresentation.ts` and `factorySwapRender.ts`
  (`rg -l "from \"\./factorySwap"` → those two + `core.ts`);
  `factorySwapPresentation.ts` is exactly the module ISSUES.md's 2026-08-10
  "generic ball-callback checkpoint" (~line 918-936) names as owning the
  three `ballAnim.ts` reducer states with the open ambient-VBlank-RNG
  boundary (#55-adjacent). Disqualified.
- **`factory-round-policy.json` `roundFlow` consumers** —
  `rg -l "factory-round-policy"` → `factoryTrainerSchedule.ts`,
  `factoryRentalGeneration.ts` (already ported, M3b/M3c), and
  `factoryOpponentGeneration.ts`. The latter is trainer/opponent-mon
  generation, imported directly by `factoryRoundBattleOrchestrator.ts` — the
  exact "opponent selection in factoryRoundBattleOrchestrator.ts" item
  RUST_PROGRESS.md R2 names as #55-adjacent and unported-until-TS-closes.
  `factoryTrainerSchedule.ts` (236 lines) is `GetRandomScaledFrontierTrainerId`
  + `GenerateOpponentMons`'s trainer retry/history loop — opponent selection
  by definition, imported by `factoryOpponentGeneration.ts`,
  `roundController.ts`, and `battleScenario.ts`. Disqualified as a family.
- **Draft-screen state core** — no separate state module exists.
  `factoryDraftScreen.ts` (790 lines) mixes `DraftScreenState`/`applySelect`/
  `moveCursor` (state) and `renderFactoryDraftScreen` (rendering) in one file
  that imports `framebuffer.ts`/`sprites.ts`/`font.ts` at the top — the
  automatic disqualifier from the brief. Splitting the file first would
  itself be a TS-side change this lane may not make unbidden. Disqualified.

## Recommended family: Factory AI move/switch-scoring leaves

Source: `AI_CheckBadMove`/`AI_CheckViability`/`AI_TryToFaint`
(`reference/pokeemerald/src/battle_ai_script_commands.c`), ported per
`docs/factory-ai-ground-truth.md` and `docs/factory-ai-checkviability-ground-truth.md`.

**Module inventory** (`rg "^import"` per file):

| Module | Lines | Test file (lines) | Engine imports |
| --- | --- | --- | --- |
| `factoryAiMaskSelection.ts` | 188 | `factoryAiMaskSelection.test.ts` (152) | none (`factory-ai-policy.json` only) |
| `factoryAiCheckBadMove.ts` | 3657 | `factoryAiCheckBadMove.test.ts` (4692) | `rng.ts`, `damageCalc.ts` (types only), 3 JSON tables |
| `factoryAiCheckViability.ts` | 9516 | `factoryAiCheckViability.test.ts` (7821) | `rng.ts`, `damageCalc.ts`, `turnOrder.ts` |
| `factoryAiTryToFaint.ts` | 275 | `factoryAiTryToFaint.test.ts` (159) | `rng.ts`, `damageCalc.ts`, **`factoryAiCheckBadMove.ts`** |
| `factoryAiDecisionPolicy.ts` | 1402 | (indirect only) | above four + `battleDecisionBoundary.ts` (types) |

All five leaves are already-ported (`rng`/`damageCalc`/`turnOrder`, M1/M4a/M4c)
or self-contained. The only non-JSON, non-already-ported type crossing in is
`BattleRngState` from `battleDecisionBoundary.ts` — a trivial
`{ value: number; calls: number }` struct, not logic; no need to port the
rest of that 899-line module. `factoryAiSwitchPolicy.ts` (705 lines) and
`factoryAiLiveDriver.ts` (573 lines) also live in this family but pull in
`battleScriptRulesContext.ts` (3098 lines) and `battleScriptSwitchinOpcode.ts`
(1324 lines) — real opcode/execution modules, not leaves. Excluded from M5;
revisit only after those opcode modules are themselves ported.

## Conflict check (fresh, 2026-08-11)

`rg -n "CheckViability|factoryAiCheck|factoryAi|AI_CheckViability|AI_CheckBadMove"`
against `ISSUES.md` and `PROGRESS.md` → **zero hits in both**. `RUST_DEFERRED.md`
has no open entries. Main lane's top three PROGRESS.md entries (1151-1153) are
all `#55` MPlay/`ClearChain` audio-cost work, unrelated namespace; no TS lane
has open work against any of these five files.

## Test surface

Both leaf modules report themselves complete inside their own tests:
`factoryAiCheckViability.test.ts` asserts "every `AI_CHECK_VIABILITY_TABLE_EFFECTS`
member ported (122/122)"; `factoryAiCheckBadMove.ts` exports
`unportedCheckBadMoveTableEffects()` as a completeness probe, and its test
comment cites "the CBM 109/109 precedent". Exact `Set` sizes counted directly
from the source (not memory): `AI_CHECK_VIABILITY_TABLE_EFFECTS` = 122,
`AI_CHECK_BAD_MOVE_TABLE_EFFECTS` = 109, `CHECK_BAD_MOVE_HANDLED_TABLE_EFFECTS`
= 131. These per-effect Sets are the natural sweep axis for TS-generated
vectors, same shape as M4a's type-effectiveness/ability/hold-item sweeps.

## Boundary sketch

- Inputs are numeric/enum-friendly (species ids, type ids, stat stages,
  move ids); effect names are strings in TS and should map to numeric ids
  in the adapter, same convention as `TYPE_IDS` in M4.
- `moves.json` (355 rows: type/power/accuracy/effect/secondaryEffectChance/
  flags/target) is read by both leaves but **only `MOVE_PP` is currently
  promoted** into `gen_tables.rs` (M3a). A new `MOVES` codegen table (type,
  power, accuracy, effect id, secondary-effect chance, contact/protect/
  mirror-move flag bits) is the M5 analog of M4b's
  `TYPE_EFFECTIVENESS_TABLE` promotion — build it once, reuse across both
  CheckBadMove and CheckViability steps.
- `species-stats.json`/`species-types.json` needs are already covered by
  the M3c `SPECIES` table (376 rows, base stats/gender/abilities) for the
  fields these two leaves touch.
- `BattleRngState` crosses as two `u32`s (value, calls); no need to encode
  the rest of `battleDecisionBoundary.ts`'s boundary/event types.

## Suggested step split (dependency order; supervisor decides)

1. **M5a** — `factoryAiMaskSelection.ts` (188 lines, trivial) +
   `MOVES` codegen table in `gen_tables.rs`, native tests only.
2. **M5b** — `factoryAiCheckBadMove.ts` native port (3657 lines, 109 table
   effects), TS-generated vectors per effect; likely wants its own
   sub-batching by effect group given the size gap versus M4a's 671-line
   `damageCalc.ts`.
3. **M5c** — `fw_` boundary + adapter + parity for M5a+M5b (M4b pattern).
4. **M5d/M5e** — `factoryAiCheckViability.ts` (9516 lines, 122 table
   effects) — the family's largest module by far; plan for several
   effect-group-batched native-port steps before its own boundary step,
   not one M4a-sized step.
5. **M5f** — `factoryAiTryToFaint.ts` (275 lines, depends on M5b) +
   `factoryAiDecisionPolicy.ts` (1402 lines, depends on all above) as the
   family's integration layer, once M5b/M5d land.
