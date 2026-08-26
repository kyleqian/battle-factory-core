# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1402 — [ts worker, 2026-08-25 ~18:15] **ISSUES #129 CLOSED as NOT-A-BUG: the stock ROM DOES draw King's Rock's `Random()` at `MOVEEND_KINGSROCK_SHELLBELL` on a KO — #129's premise was a truncated-trace artifact, and the engine was already source-exact**

- **State:** #129 deleted from `ISSUES.md`; no engine change was needed. Green at
  HEAD: `npm test` **1,146 files passed / 44 skipped, 10,583 passed / 223 skipped
  / 0 failed**, `npm run build` green, `npm run typecheck` green.
- **RUNG 1 — mechanism.** `tools/probe/probe-issue129-kingsrock-ko-off.py` watches
  `gBattleMoveDamage`, `gSpecialStatuses[target].{physical,special,shellBell}Dmg`,
  `gMoveResultFlags`, attacker/target + item, `gBattleScripting.moveendState`
  (`gBattleScripting+20`) and `gBattlescriptCurrInstr` (resolved to
  `BattleScript_*+n`) every frame. The gate6 hit fixture's 934-frame trace
  **stalls at frame 443**: `STRINGID_TARGETFAINTED` ends in the `0xFB` prompt
  code, so `BattleScript_FaintTarget`'s `printstring`
  (`data/battle_scripts_1.s:2817-2823`) leaves the player controller in
  `CompleteOnInactiveTextPrinter` with `gBattleControllerExecFlags = 1`, and
  `gBattlescriptCurrInstr` sits on `BattleScript_FaintTarget+12` (the `return`
  into `moveendall`) for the rest of the trace — verified out to 3000 idle
  frames. **`Cmd_moveend` never ran in the old window.** With A pulses appended,
  state 10 is seen at frame 640, state 11 at 641, state 17 at 642, and **exactly
  one `Random()` lands inside frame 642**; it disappears when the attacker's item
  is forced to 0. At state 11 every gate ahead of the draw holds
  (`gBattleMoveDamage` 125, `physicalDmg` 125, flags 0 — `Cmd_resultmessage`
  cleared them at frame 271, 20 → 0); only the trailing
  `&& gBattleMons[gBattlerTarget].hp`, evaluated **after** the draw
  (`src/battle_util.c:3773-3780`), is false.
- **RUNG 2 — scope: GENERIC.** Four arms, each run twice fresh, byte-identical
  (`tools/probe/receipts/issue129-kingsrock-ko-off.json`, built by
  `tools/probe/build-issue129-receipt.py`): FISSURE OHKO KO **67/359/642**;
  same fixture no item **67/359**; EARTHQUAKE one-hit KO of a 4×-weak MAGNETON
  **72/73/76 + 642**; non-KO EARTHQUAKE on METAPOD (125 → 76) **72/73/76 + 299**.
  King's Rock draws after *any* hit that set physical/special damage. **Shell
  Bell is not suppressed either** — `shellBellDmg` is still 125 at state 12 on
  the KO arm; its only remaining gate is `attacker hp != maxHP`.
- **RUNG 3 — no port.** `battleScriptMoveEndOpcode.ts:883-905` already matches.
  `tests/gate6OhkoReceipt.test.ts`'s `it.fails` is now a real `it` asserting the
  ROM's **three**-draw OHKO hit; new `tests/issue129KingsRockKoReceipt.test.ts`
  (6 tests) pins all four ROM arms and drives the kernel's KO / non-KO King's
  Rock draw plus the Shell Bell KO heal (−15 = −(125/8), record cleared) and its
  full-HP control. Mutation-checked: hoisting the source's trailing
  `targetState.hp !== 0` ahead of the draw fails both suites.
  `tools/probe/receipts/gate6-ohko-off.json`'s `kingsRockControl` /
  `engineDivergence` blocks are corrected in place with a `windowTruncation`
  record; its raw truncated ledger is kept verbatim as the raw measurement.
- **Next:** supervisor reruns the gates. No trajectory pin moved (no engine
  change), so nothing needs re-pinning.
- **Notes:** the one thing NOT staged live is a Shell Bell **heal** on a KO
  against a ROM arm — that needs an attacker already below max HP, i.e. a
  two-turn fixture this bounded step had no room for. The source condition is
  fully determined by the RAM evidence above and pinned in the kernel, so no
  issue remains open. Generalizable lesson for future receipts: **a battle-lab
  trace that ends on a faint message has not observed `moveend`** — the faint
  string's `0xFB` prompt blocks every later opcode until a button press.

---

## 1401 — [ts worker, 2026-08-25 ~16:47] **ISSUES #128 CLOSED both halves: stock-ROM receipt first (Intimidate/Trace DO write `BATTLE_HISTORY->abilities[0]`, the PLAYER's slot, costing the AI 8 `Cmd_get_ability` draws), then the three-site fix + the history-before-trapper order**

- **State:** #128 is fully landed and deleted from `ISSUES.md`. Receipt
  `bf1a5484`, fix `fdc21ede`, trajectory re-pins `c2fd533c`. Green at HEAD:
  `npm test` **1,143 files / 10,563 passed / 223 skipped / 0 failed**,
  `npm run build` green, `npm run typecheck` green,
  `npm test -- tests/factoryAi` 32 files / 1,432 tests green.
- **RUNG 1 — receipt (stock ROM, tree unchanged).** Three `mechanicLab`
  `overrides.parties` arms against the same two-ability player lead Golduck
  (set 418, `ABILITY_DAMP` / `ABILITY_CLOUD_NINE`), all four AI slots one
  move. `BATTLE_HISTORY->abilities[0..3]` read right after battle start via
  `gBattleResources` → +24 (`struct BattleResources` member 6) → +64
  (`struct BattleHistory`: `usedMoves[4]` × 16 bytes), `include/battle.h`:
  - **INTIMIDATE** (AI Mightyena, set 202): **`[22, 0, 0, 0]`** — holder is
    battler **1**, record lands on **0**. **PREMISE HELD.**
  - **CONTROL** (AI Poochyena, single-ability Run Away 50): **`[0, 0, 0, 0]`**.
  - **TRACE** (AI Gardevoir set 813, `abilitySlot 1`): **`[6, 0, 0, 0]`** —
    the *copied* Damp, again on slot 0, not on the tracer.
  Every `Random()` in turn 2's `HandleTurnActionSelectionState` window
  attributed to its caller by targeted single-step (pass-1 `sRandCount`
  totals reconcile 1:1 with pass-2 hits in all three arms): control **14**
  draws = `Cmd_get_ability` **8** + `BattleAI_SetupAIData` 4 +
  `BattleTurnPassed` 1 + `ChooseMoveOrAction_Singles` 1; intimidate and trace
  **6** each = `Cmd_get_ability` **0** + the *identical* 6-draw remainder. So
  a non-zero `abilities[0]` removes exactly 8 `get_ability AI_TARGET` guesses
  per AI decision. Each arm run **twice** from a fresh oracle,
  **byte-identical** (`a2194263…` / `c24e3d54…` / `9f520f8f…`).
  Receipt `tools/probe/receipts/issue128-ability-history-off.json`; probe
  `tools/probe/probe-issue128-ability-history-off.py`; fixtures from
  `tools/probe/generate-issue128-ability-history-fixtures.ts`. (The battle-lab
  checkpoint already sits inside turn 1's selection run — the AI has committed
  and Intimidate has already fired — so the first fully observable AI decision
  is turn 2's.)
- **RUNG 2 — fix (3 sites + order, all mutation-checked).** (1)
  `factoryBattleStart.ts` Intimidate/Trace loops now call
  `recordBattleScriptAbilityReveal(rules, 0, …)`. (2)
  `battleScriptFaintedActionsOrchestration.ts` state 6: both holder-index
  writes → index 0. (3) `factoryAiCheckBadMove.ts` `nextGetAbilityDraw` +
  `checkAbilityAiTarget` test `knownAbility` **before** the trapper shortcut
  (`factoryAiCheckViability.ts` already had it). New
  `tests/issue128AbilityHistoryReceipt.test.ts` (10 tests) drives all three
  arms through battle start + the first live AI decision and pins the ROM's
  8-vs-0 draw delta; the fainted-actions suite gains slot-0 Intimidate and
  Trace pins. Reverting each item fails 5/7, 2/11 and 1/10 respectively.
- **Next:** supervisor reruns the gates. **The vanilla soak canary trajectory
  is EXPECTED to move** — source-required draws are now removed whenever an
  Intimidate/Trace lead faces a two-ability player mon. Not a regression.
- **Notes:** no existing test pinned the holder index, so nothing needed
  re-pinning there; the AI parity suites were green before and after. Three
  Tier-1 **trajectory** tests did move and were re-pinned in their own commit
  (`c2fd533c`), all self-authored curated-seed scenarios, none an
  oracle-verified ROM trajectory: `factoryWholeBattle` (Granbull/Intimidate vs
  Azurill/two-ability — #128's exact shape: 12 → 13 AI decisions, cursor 196 →
  199), `factoryBrainRoundShape` (SILVER_SEED 4 → 1, GOLD_SEED 2 → 8; the
  file's own "pick a different seed" throw is the designed remedy),
  `factoryRoundChaining` case (b) (seed 0 → 3). Live AI receipts unaffected as
  predicted: `verify-factory-ai-cbm-preamble-live.ts` 4/4 MATCH and
  `verify-factory-ai-curse-live.ts` 6/6 PASS (both stage single-ability
  species). `docs/ability-item-parity-census.md` moved by pure line drift from
  the new source-cite comments (same four `factoryAiCheckBadMove.ts` sites,
  same abilities) — regenerated, all 17 validation checks pass. Executable
  frontier ratchet untouched; no new `unsupported-branch` barrier.

---

## 1400 — [ts worker, 2026-08-25 ~16:05] **Ability activation-path audit COMPLETE: 38/38 SOURCE-EXACT after the second pass; the first pass's 3 DIVERGENT rows are REFUTED, and one new real finding replaces them — Trace's `RecordAbilityBattle(0, copiedAbility)` is unported (RNG-stream affecting)**

- **State:** `docs/ability-activation-audit-2026-08-25.md` is finished — all
  38 L50-carrier no-receipt abilities paired source↔engine at cited
  `file:line`, both halves opened at HEAD. **SOURCE-EXACT 38, DIVERGENT 0,
  UNVERIFIED 0**; 12 individual *sites* inside exact rows are
  UNREACHABLE-IN-FACTORY-L50 with proof (Battle Palace, Battle Arena, Battle
  Pike, doubles-only AI labels, the roaming AI, overworld, and the Frontier
  disobedience short-circuit). Docs-only: only this doc and PROGRESS.md
  changed, so 1398's gates stand (`npm test` 1,140 files / 10,542 passed /
  223 skipped; `npm run build` green). Full suite deliberately not re-run per
  the step brief; `npm run build` + `npm run test:smoke` re-run green.
- **REFUTED (was 1400's headline).** The Magnet Pull / Plus / Minus
  "`ABILITY_ON_FIELD2` writes a false ability onto battler 0" finding is
  **wrong**. `AbilityBattleEffects`' record tail (`battle_util.c:3194-3195`)
  is guarded by `caseID < ABILITYEFFECT_CHECK_OTHER_SIDE`, and that constant
  is **12** (`include/battle_util.h:24`) — the first pass read it as 15,
  which is `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` (`:27`).
  `ABILITYEFFECT_FIELD_SPORT` is **14**, so `14 < 12` is false and **no
  record is written**. All three rows are SOURCE-EXACT; the port's extra
  `absentBattlerFlags` skip (`factoryAiSwitchPolicy.ts:252`) is
  singles-unreachable, and `damageCalc.ts:370-376` matches the ungated
  `default:` scan.
- **NEW F1 (real, ranked top).** The same tail *does* fire for
  `ABILITYEFFECT_TRACE` (**11** < 12) and `ABILITYEFFECT_INTIMIDATE1/2`
  (9/10). Both Trace dispatch sites pass the literal `battler = 0`
  (`battle_main.c:3882`, `battle_util.c:1960`), so a successful copy runs
  `RecordAbilityBattle(0, copiedAbility)` — in Factory singles that is the
  **player's** slot, handing the AI the player's real ability and removing
  the `Random() & 1` two-ability guess from `Cmd_get_ability` (`:1361` ahead
  of `:1383`) — an **RNG-stream** divergence. The port writes nothing at
  battle start (`factoryBattleStart.ts:484-513`) and writes the *tracer's*
  index post-faint (`battleScriptFaintedActionsOrchestration.ts:454-459`).
  16 L50 carriers (Porygon/Porygon2/Gardevoir). **F2:**
  `factoryAiCheckBadMove.ts:720-725,772-776` tests the trapper abilities
  **before** the history cache, inverting source order — latent today, live
  the moment F1 is fixed. **Adjacent (out of scope, recorded not filed):**
  Intimidate shares the tail and its battler-0 record is outright *false*.
- **F3 RESOLVED.** The coverage baseline's "Trace never on a lead in 114,756
  samples" is **instrument sampling, not a resolution bug**:
  `randomRoundSoakCoverage.ts:547,567-583` samples
  `rulesContext.battlers[i].ability` on the first ticked frame, and
  `createFactoryBattleStart` has already overwritten the tracer's slot with
  the copied ability (`factoryBattleStart.ts:494-501`) before that frame
  exists. `ABILITY_TRACE` is structurally uncountable there.
- **Also corrected in the doc:** Liquid Ooze — Absorb **adds** the
  `DMG_CHANGE_SIGN` (`battle_scripts_1.s:348-350`), Leech Seed **skips** it
  (`:3271-3276`); the first pass's one-line gloss said "skips" for both.
  Shield Dust's `flags == 0` stat-drop gate **is** implemented
  (`battleScriptStatBuffs.ts:278`). Rock Head has **no** AI site at all
  (`rg -i recoil` over `battle_ai_scripts.s` + `battle_ai_script_commands.c`
  = 0 hits).
- **Next:** supervisor files **one** ISSUES entry from §Findings F1 (proposed
  text is in the doc, and should name F2's file:line so both are fixed
  together; caseIDs 9/10/11 share the tail) and stages the `mechanicLab`
  recipe there for a stock-ROM receipt before any fix. No further audit work
  on this doc — it is complete. `docs/soak-coverage-baseline-2026-08-25.md`
  §6b's `unknown` WHY for Trace should become a sampling note next time that
  doc is regenerated.
- **Notes:** throw-site census re-run this session
  (`python3 tools/probe/premise-census.py --only <file> --premise`; the file
  is not executable). Five premise-worded throws sit on audited paths
  (`factoryBattleStart.ts:242,307,320`, `battleScriptHitChainOpcode.ts:3475`,
  `battleScriptMoveEndOpcode.ts:271`) — all hold, none was reached; they are
  tabulated in the doc header. Engine comments claiming parity were
  re-derived, not trusted: `battleScriptStatBuffs.ts:16-19`'s Shield Dust
  claim turned out to be correct but *narrower* than the first pass read it.
