# Destin's two canonical faint replacements — decision-side proof (ISSUES #39 rank-2)

Side-lane, test-only step. Answers the open question `docs/onix-readylag-
destin-bench-probes.md` Probe 2 left standing: does the ported AI
replacement path reproduce DESTIN's real turn-5 (PIDGEOTTO over MURKROW)
and turn-13 (MURKROW) send-outs? New test:
`tests/destinCanonicalReplacements.test.ts` (6 cases, green). No `src/`
changes.

## The source rule is not `ShouldSwitch`

`factoryAiSwitchPolicy.ts`'s `evaluateFactoryAiSwitchPolicy` ports
`ShouldSwitch` — the *voluntary* mid-turn "should the AI switch out" ladder,
consulted only during ordinary command selection. A faint is not a
voluntary decision: `docs/forced-switch-ground-truth.md` §1b/§2/§6 already
source- and RAM-traced the real path — `OpponentHandleChoosePokemon`
(`battle_controller_opponent.c:1621-1676`) calls
`GetMostSuitableMonToSwitchInto()` (`battle_ai_switch_items.c:629-790`)
directly and unconditionally, bypassing `ShouldSwitch` entirely. That
function is already ported as `getMostSuitableMonToSwitchInto`
(`src/engine/battleAiSwitchInto.ts`) and is pure/RNG-free (no RNG parameter
in its signature at all — matching the ground-truth doc's own live ledger,
which found the entire switch-in dance holds `gRngValue` bit-identical).
The new test drives that function directly, per the brief's item 3.

## Reconstructed inputs (both events)

- **DESTIN's bench**: species/slot/moves from `docs/onix-readylag-destin-
  bench-probes.md` Probe 2 (GROVYLE slot 0, MURKROW slot 1, PIDGEOTTO slot
  2, otId 416049562).
- **Onix's types/stats** and **GROVYLE's stats**: `docs/battle-turn-
  notes.md` §5's RAM-read level-50 stat table, already mirrored verbatim as
  the `ONIX`/`GROVYLE` fixtures in `tests/damageCalc.test.ts`.
- **PIDGEOTTO's stats**: `docs/battle-turn-notes.md` §13 note 7 ("this
  session only confirms Pidgeotto's stat block (atk 98, def 61, speed 77,
  spAtk 56, spDef 56, hp 156/156, level 50)").
- **The killing move each turn**: turn 5 is Onix's ROCK_SLIDE (§13
  HEADLINE/ledger); turn 13 is Onix's DRAGON_BREATH (§47-50's rung-3/4
  ledger, KO at tick 15887).
- **No active atk/def/spAtk/spDef stat-stage changes anywhere in this
  dossier's covered moveset** (checked against every move either side is
  shown using across turns 1-13: only DOUBLE_TEAM/FEATHER_DANCE touch
  evasion/opponent-attack, neither of which this formula reads) — so
  `NEUTRAL_STAT_STAGES` is correct for both events, not an assumption of
  convenience.
- **`AI_CalcDmg`'s formula**: `battle_script_commands.c:1306-1319` —
  `AI_CalcDmg(attacker, defender)` calls the exact same `CalculateBaseDamage`
  this engine already ports as `calculateBaseDamage`
  (`src/engine/damageCalc.ts`), with `attacker` = the just-fainted
  battler (its struct not yet overwritten) and `gCurrentMove` = whatever
  move was last executed (the killing blow). Reused, not re-derived.

## Why PIDGEOTTO, not MURKROW, at turn 5

Pass 1 (pure typing gate) cannot resolve it: Onix is ROCK/GROUND, and
`GROUND` is **immune** to `FLYING` (`type-effectiveness.json`), which both
remaining candidates share as their second type (MURKROW DARK/FLYING,
PIDGEOTTO NORMAL/FLYING). `ModulateByTypeEffectiveness` zeroes both
candidates' type-matchup score, and since the loop's `bestDmg` starts at
`TYPE_MUL_NO_EFFECT` (0) and the comparison is strict (`bestDmg < typeDmg`),
neither ever becomes `bestMonId` — the whole party is marked invalid and
the source falls to pass 2. The new test asserts this directly (`{ kind:
"damage-fallback-needed" }` with no fallback supplied).

Pass 2 scores every bench mon's **every** move (not just damaging ones —
a documented source quirk `battleAiSwitchInto.ts` already preserves) by
`AI_CalcDmg`'s shared `baseDamage` scaled by STAB (never triggers here —
GROVYLE is GRASS/GRASS, no candidate move is Grass) and the move's type
effectiveness against Onix's ROCK/GROUND. MURKROW's best is any DARK move
(neutral vs. both Onix types, ×1). PIDGEOTTO's SAND_ATTACK — a
**non-damaging** status move — is GROUND-type, and `GROUND` is
**super-effective (2×) against ROCK**: `floor(baseDamage×20/10)×(1× vs
GROUND) = 2×baseDamage`, beating MURKROW's `1×baseDamage` and every other
FLYING/NORMAL candidate move (0.5× vs ROCK). This is exactly the "possible
bug" the source itself flags (`battle_ai_switch_items.c:712-714`) applied
to a status move on top of it: the AI "scores" SAND_ATTACK as if it were a
real attack. The winner is provably independent of `baseDamage`'s exact
magnitude (a shared positive multiplier for every candidate/move pair,
verified in the test at baseDamage ∈ {1, 5, 20, 100}) — the real computed
value (20, via `calculateBaseDamage`) is reported for fidelity, not because
the ranking depends on it.

## Why MURKROW at turn 13

Trivial once GROVYLE (dead since turn 5) and PIDGEOTTO (the outgoing
active) are excluded: MURKROW is the **only** legal candidate left in
DESTIN's 3-mon bench, so pass 2 selects it as long as any one of its four
moves yields nonzero fallback damage — true for any realistic positive
`baseDamage` (the test asserts this holds at baseDamage ∈ {1, 22, 100},
`22` being the real `AI_CalcDmg(Pidgeotto, Onix)` value with
`gCurrentMove` = DRAGON_BREATH). No type-matchup coincidence is needed
here; this event does not discriminate between "pick by score" and "pick
the only survivor."

## Verification

`npx vitest run tests/destinCanonicalReplacements.test.ts
tests/factoryAiSwitchPolicy.test.ts tests/factoryAiR13dEvidence.test.ts
tests/executableFrontierRatchet.test.ts` — 4 files, 37 tests, all green.
`npx tsc --noEmit` clean. No existing file modified.
