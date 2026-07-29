# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 660 — [BOUNDED MAIN WORKER 2026-07-28 ~21:05] damageCalc hold-item block ported bit-exact; census hold effects 22/42 -> 41/42

- **State:** union green at **452 files / 4855 tests**, production build,
  `git diff --check` clean. Census regenerated in-commit: **hold effects
  41/42 engine-referenced (weighted 775/850)**, abilities unchanged 55/70
  (weighted 905/1103), all 15 validations pass. Headline matched the
  supervisor's prediction exactly.
- **Did:** ported `pokemon.c` CalculateBaseDamage's hold-item block
  (:3171-3201) into `damageCalc.ts`, inserted at the exact source position
  (after Huge/Pure Power, before entry 659's ability block, so truncation
  order matches): the `sHoldEffectToType` attacker-only type-power loop
  (all 17 rows, first-match-break, `(param+100)/100` on attack for
  physical types / spAttack for special), Choice Band (1.5x attack — the
  choice-lock logic already referenced the hold effect, but the damage
  boost itself was missing), and the 6 species-locked items (Soul Dew
  spAttack/spDefense 1.5x gated on `!BATTLE_TYPE_FRONTIER` + Latias/Latios,
  Deep Sea Tooth/Scale, Light Ball, Metal Powder, Thick Club, all flat 2x
  on the correct stat/species pair). Added a local `spDefense` variable
  (previously read straight off `defender.spDefense`) since Soul Dew/Deep
  Sea Scale now mutate it before the special branch reads it. Wired the
  real call site (`battleScriptHitChainOpcode.ts`'s
  `calculateBattleScriptBaseDamageForCurrentMove`) with both battlers'
  resolved hold effect (via the existing `resolveBattleScriptBattlerHoldEffect`
  / `...HoldEffectParam` — no second item table invented), species, and
  `isFrontierBattle` computed from the real `battleTypeFlags` (a genuine
  structural no-op in this engine: every battle sets `BATTLE_TYPE_FACTORY`,
  a `BATTLE_TYPE_FRONTIER` member). 17 new Tier-1 tests: type-boost
  physical/special routing + truncation, species gating positive *and*
  negative for all 6 items, Soul Dew's frontier gate proven both ways, and
  a 4-stage combined-order test (Huge Power -> Choice Band -> Marvel Scale
  -> Explosion) using odd numbers so a wrong stage order would visibly
  produce a different result. Two new census infra spellings classified
  (`HOLD_EFFECT_NAME_BY_ID`, `HOLD_EFFECT_TO_TYPE`) in the census script's
  `ENGINE_INFRA_SPELLINGS` allowlist.
- **Next:** supervisor pick the next row — `HOLD_EFFECT_QUICK_CLAW` (75 L50
  carriers, the single remaining unreferenced hold effect; turn-order work,
  a side-lane scout owns `GetWhoStrikesFirst`) or an ability row
  (Chlorophyll 38 / Swift Swim 34 speed-calc class, or the ON_DAMAGE
  contact family).
- **Notes:** all 19 target hold-effect rows closed exactly as predicted
  (15 named type-power rows + Thick Club, Deep Sea Scale, Light Ball,
  Metal Powder). Soul Dew and Deep Sea Tooth stay `zero-carrier` (no L50
  set carries them) despite being fully ported — expected, not a gap.
  Ghost/Dragon Power also flipped to engine-referenced as a side effect of
  porting the real table (still zero-carrier). No abilities, badge boosts,
  field sports, AI, Enigma Berry, or new `unsupported-branch` barrier
  touched (ratchet unchanged). PAPERCUT: none this session.

---

## 659 — [BOUNDED MAIN WORKER 2026-07-28 ~20:45] damageCalc ability stat/power modifier block ported bit-exact; census abilities 43/70 -> 55/70

- **State:** commit `1f8d7727`; union green at **452 files / 4841 tests**,
  production build, `git diff --check`. Census regenerated in-commit:
  **abilities 55/70 engine-referenced (weighted 905/1103)**, hold effects
  unchanged 22/42 (weighted 713/850), all 15 validations pass.
- **Did:** ported `pokemon.c` CalculateBaseDamage's ability block
  (:3158,3203-3226) into `src/engine/damageCalc.ts` in exact source order
  (truncation order is load-bearing): Huge/Pure Power attack doubling
  (before the stat-stage mod), Thick Fat, Hustle, Plus/Minus (real
  `ABILITY_ON_FIELD2` battler-field scan via new `activeBattlerAbilities`,
  not a doubles stub), Guts (reconciled with the pre-existing burn-halving
  exception — a burned Guts attacker now gets both no-halving and the 1.5x),
  Marvel Scale (now correctly ordered *before* Explosion's defense halving,
  so they stack), and the Overgrow/Blaze/Torrent/Swarm pinch power boosts.
  Wired the one real call site (`battleScriptHitChainOpcode.ts`'s
  `calculateBattleScriptBaseDamageForCurrentMove`) with defender ability,
  `hasStatus1`, attacker hp/maxHP, and the active-battler ability scan so
  none of this is dormant in real battles. 20 new Tier-1 tests (synthetic
  round-number fixtures for legibility + one updated RAM-pinned burn/Guts
  case) cover every modifier incl. the pinch-boost `hp <= maxHP/3` boundary
  and the Huge Power/stat-stage truncation-order case. Used the project's
  existing "local identity const" idiom (`const ABILITY_GUTS =
  "ABILITY_GUTS"`) so the census's identifier-only scan counts these refs.
- **Next:** supervisor pick the next ability/item parity worklist row —
  Chlorophyll/Swift Swim (speed-calc modifier class, same shape as this
  step), the ON_DAMAGE contact family (Static et al.), or hold-item rows
  (Quick Claw, the type-power family). This row's dense-oracle-evidence
  follow-up is intentionally deferred to the side-lane scout pack per the
  supervisor's plan.
- **Notes:** all 12 target rows closed (ABILITY_HUGE_POWER, PURE_POWER,
  THICK_FAT, HUSTLE, PLUS, MINUS, GUTS, MARVEL_SCALE, OVERGROW, BLAZE,
  TORRENT, SWARM) — none blocked. No hold items, badge boosts, field
  sports, AI, or new `unsupported-branch` barrier touched (ratchet
  unchanged). PAPERCUT: none this session.

---
## 658 — [INTERACTIVE SESSION 2026-07-28 ~20:25] Ability/item parity setup landed: census generator + worklist live; scope decisions recorded (AI in scope, audio = S11)

- **State:** master `275c415c`+docs, union green at **449 files / 4819
  tests**, production build, `git diff --check`. New standing artifacts:
  `npm run census:ability-item` →
  `docs/ability-item-parity-census.md` (ranked worklists, 15 validations,
  byte-idempotent); `npm run extract:ability-item-hooks` →
  `src/data/gen/ability-item-hooks.json` (literal AbilityBattleEffects/
  ItemBattleEffects segmentation + inline sites, exact-set pinned).
  **Headline: abilities 43/70 engine-referenced (weighted 729/1103 L50
  carriers), hold effects 22/42 (weighted 713/850).**
- **Did:** built the move-census pattern for the last two enumerable
  families. Ground truth: 20 ability caseID segments (+3 alias
  pseudo-modes), 5 item segments, 187+54 inline sites across 6 rules + 2
  AI files. Census: source hooks × L50 carriers (deterministic
  single-ability split for fixture selection) × live engine surface
  (identifier-only scan — the engine's universe-spelling ABILITY_SYMBOLS
  name table made naive counting vacuous at 70/70; string literals
  excluded, jumpifability live-set exports unioned, alias spellings
  dealiased, unknown spellings hard-error). Tier-1: 6 new tests incl. two
  regeneration ratchets — **the census doc is pinned to the tree; regen it
  in the same commit as any engine change that moves it.** ROADMAP: S11
  audio stage created (separate milestone, user-directed); 2026-07-28
  scope block added under S10.
- **Next:** supervisor sessions consume the worklists exactly like move
  census rows: top unreferenced abilities Chlorophyll 38 / Thick Fat 36 /
  Guts 36 / Swift Swim 34 (damage/speed-calc modifier class), contact
  ON_DAMAGE family (Static 27 …), pinch boosts; top unreferenced hold
  effects Quick Claw 75, type-power family (~40 sets), Choice Band is
  referenced-partial. Scout-ahead prep packs + serial implementation rows
  at exact predicted deltas is the proven cadence. Switch/item/trainer AI
  is IN scope for a later milestone (user decision); doubles/Open/Noland
  stay out; audio is S11.
- **Notes:** "engine-referenced" = named surface, not semantic
  completeness — rows close via fixtures + oracle evidence like move rows
  (see the doc's Caveats). Animation program live to ~21:06 tonight;
  its fold at next orient is expected.

---
