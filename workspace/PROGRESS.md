# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1403 — [supervisor wind-down, 2026-08-25 ~20:20] **Audit + receipt day: three source-vs-port audits (ability 38/38, held-item 38/38, end-turn ordering 40/47 rows) → #128 FOUND+FIXED (Intimidate/Trace record onto the player's AI-history slot: 8 AI draws), #130-#133 FOUND+FIXED (isFirstTurn decay, ENDTURN_ORDER recompute + tie draw, case-major field loop, end-turn flinch clear), #129 filed then NOT-A-BUG (trace stalled at the faint prompt); activation census (1,216 seeds, 0 CRASH/0 HANG) → every announcing hole receipted (Water Veil, Arena Trap, Leppa) + OHKO/Sturdy pack; 3 of 4 first-pass DIVERGENT audit claims refuted at source; all five gates on the final tree**

- **Final gates on THIS tree (`9302e76b`, supervisor's own runs, all `--parallel`):** vanilla 0:20 **20/20**, full 0:60 **60/60**, winning 0:60 **60/60**, winning-swap 0:60 **60/60**; fifth gate — winning `--vary-rng --first-round` carry 0 **100/100**, carry 14 **100/100**, carry 28 **100/100**, winning-swap carry 0 **100/100** — **`budget` 0 on all four** (gates ran 18:57-20:08 under load 25-53: the animation Codex supervisor was live all session). Full `npm test` on `9302e76b` **1,150 files / 10,605 passed / 223 skipped**; `npm run build` green. DEFERRED.md: no open entries. The vanilla canary's TRAJECTORY differs from 1398 by design: #128 removed source-required AI draws and #130/#131/#133 change end-turn order/draws; the gate is the count, and each engine change carries a byte-identical stock-ROM receipt.
- **Orient:** master `2a84050e`, both lane branches folded (0 ahead); oracle freshness FAIL = the standing false positive (only oracle-side commit since 8014's restart is that session's own `3e29880b`, 6 min later); animation Codex supervisor live 15:16-21:16 on the shared services, so no restart. Baseline smoke 444/444 + build green.
- **Did (12 worker steps, all Opus, ~$95):** (1-2) ability audit ×2 (9+24 min): **38/38 SOURCE-EXACT**; its first pass's 3 DIVERGENT rows (Magnet Pull/Plus/Minus `ABILITY_ON_FIELD2` history write) **refuted by me** — `ABILITYEFFECT_CHECK_OTHER_SIDE` is 12, so the `RecordAbilityBattle` tail never runs for FIELD_SPORT (14); real finding = #128. (3) held-item audit (10.5 min): 31 exact + 1 DIVERGENT **refuted** (`SwitchInClearSetData` is `battle_main.c:3253`, Choice Band IS cleared on switch-in) + 6 UNVERIFIED cure-berry rows **resolved by me** as unreachable in singles (ITEMS2 cures before fainted-actions polls) → 38/38. `docs/ability-activation-audit-2026-08-25.md`, `docs/held-item-activation-audit-2026-08-25.md`. (4) **activation census** `docs/soak-activation-census-2026-08-25.md`: 8 sweeps, 55/71 abilities + 35/40 items ACTIVATED; announcing holes = Water Veil / Arena Trap / Leppa; Damp/Trace already evidenced; Truant/Trace instrument-blind. (5-6) receipt packs `gate6-water-veil`, `gate6-leppa-berry` (`36169f29`/`6d3c2837`), `gate6-arena-trap`, `gate6-ohko` (`6f123019`/`37ed4aff`) — all byte-identical twice, engine pins agree (Arena Trap: the refusal is a PARTY-MENU refusal from `HandleTurnActionSelectionState`, not `Cmd_jumpifcantswitch`). (7) **#128** receipt-then-fix (`bf1a5484`/`fdc21ede`/`c2fd533c`): `abilities[0] = [INTIMIDATE,0,0,0]` on the ROM, 8 `Cmd_get_ability` draws removed vs control; three-site fix + history-before-trapper order; 3 curated trajectory pins re-pinned. (8) **#129** (`9e4f86de`…`c9219630`): the OHKO trace had stalled at the faint prompt before `moveend`; with A pulses the ROM draws King's Rock exactly where the engine does — engine source-exact, 4 arms + Shell Bell KO heal pinned, #129 deleted. (9) **end-turn ordering audit** (26 min, `docs/end-turn-ordering-audit-2026-08-25.md`): 40 SAME-ORDER / 7 DIVERGENT rows (4 root causes) / 0 UNVERIFIED → #130-#133 filed, all supervisor-verified at source. (10) **#130/#132/#133 fixes** (side, 45 min, cap-killed with 12 trajectory pins red but all code + receipts committed): `gate6-first-turn-decay` (Fake Out `But it failed!` on turn 2; Speed Boost gated on the switch-in turn) + `gate6-screen-expiry-order` (foe's Reflect before Light Screen) receipts, `e56b4862`/`8c394142`/`69125042`. (11) **#131 fix** (ts, cap-killed mid-suite; salvaged `7b671ae1`): `issue131-endturn-order-off` receipt (order recomputed inside `BattleTurnPassed`; a speed tie costs exactly one extra draw and can swap), port `03a919c7`. (12) **union re-pin** (side, cap-killed after committing everything but its final suite): master merged, every moved curated pin attributed to one of the four fixes (whole-battle's first divergence = #131's tie draw), manifest regenerated; my own full suite on the union is the verification above.
- **Sibling folds:** animation-main 4 commits (Eruption dense-latch evidence + `tools/compare` extractor; nothing under the Scene-OFF engine, so the gates above stand for the union) merged `c429f628` while its Codex supervisor was still live (cap 21:16); **at close `animation-main` is 7 commits ahead again — deliberately left unfolded (no time for another union suite before the deadline); fold at the next orient**; post-fold union `npm test` **1,153 files / 10,614 passed / 223 skipped** on `9632271c`; `npm run build` green; rust-main 0 ahead.
- **Next:** (1) join today's receipts into the Gate-6 manifest's hand-coded `hookReceiptInfo` registry (Water Veil, Arena Trap, Sturdy, Leppa, Damp, Trace, #128, #130-#133 rows still read `engine-referenced-no-oracle-receipt`) — brief drafted; (2) a live ROM arm for Shell Bell's heal on a KO (two-turn fixture; kernel-pinned only today); (3) activation-census instrument filler: attribute `STRINGID_PKMNLOAFING`/`PKMNTRACED`, split "named in an item-manipulation message" from "fired"; (4) more lifecycle/ordering audits — they out-found site-by-site audits today (end-turn 4 real findings vs ability 1); candidates: switch-in hook ordering across both sides, faint-replacement sequencing, multi-turn move state across switches; (5) parked #71/#73/#39/#55; dormant #121; doubles-era #109/#114.
- **Notes:** PAPERCUTS +3 (`rg` over the `reference/` symlink returns zero hits silently; battle-lab checkpoint is past turn 1's AI decision — window turn 2; traces ending on a faint prompt stall before `moveend`). Opus audit/staging workers early-stopped at 9-16 min of 45-50-min caps until briefs carried explicit pacing (then 24-45 min, complete). Three cap-kills today all salvaged with zero code loss (commit-per-rung discipline).

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

