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


## 662 — [INTERACTIVE TOOLING FIX 2026-07-28 ~21:40] Claude supervisor cwd persistence mechanically disabled

- **State:** tree green at **452 files / 4856 tests**, launcher profile
  coverage **16/16**, production build, `bash -n`, `git diff --check`, and
  Battle Scene OFF oracle info. Game state, census, oracle fixtures, and
  animation coverage are unchanged.
- **Did:** `run-supervisor.sh` now exports Claude Code's supported
  `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` policy for every Claude
  supervisor, including hybrid and animation-lane launches. Each Bash tool
  call therefore starts from that supervisor's launch root after temporary
  worktree inspection. `--print-config` exposes the resolved policy as
  `project-root-reset`; Codex remains `per-command`. A launcher regression
  test pins default Claude, hybrid, and Codex behavior. Deleted the resolved
  10-hit supervisor-cwd entry from `PAPERCUTS.md`.
- **Next:** resume entry 661's ordered ability/item work: falsify the
  two-turn RNG-gap hypothesis, then wire speed ability/hold-effect/weather
  inputs before Quick Claw.
- **Notes:** this is launcher-only; no battle engine, renderer, trace,
  barrier ratchet, or oracle-profile change. The existing “merge from the
  owning tree” workflow remains useful defense in depth.

---

## 661 — [SUPERVISOR WIND-DOWN 2026-07-28 ~21:20] Ability/item parity surge: census abilities 55/70 + hold effects 41/42; speed/turn-order scout pack landed; animation-main folded twice (Tickle exact)

- **State:** master `2f5167a8`, union green at **452 files / 4855 tests**,
  production build, `git diff --check` clean, census byte-idempotent
  (**abilities 55/70 engine-referenced, weighted 905/1103; hold effects
  41/42, weighted 775/850; QUICK_CLAW is the only unreferenced hold-effect
  row**). DEFERRED.md empty; no orphan worktrees or branches; both oracle
  profiles fresh (checked at orient).
- **Did:** (1) folded `animation-main` at orient (`1aefbdf8`, Tickle/Leaf
  Blade evidence + the Omanyte-vs-Omastar carrier-mismatch catch) and again
  at wind-down (`2f5167a8`) — **MOVE_TICKLE promoted exact; L50 animation
  coverage 78/276**; animation session ended ~21:06, lane fully folded.
  (2) Main worker: CalculateBaseDamage ability block bit-exact
  (`1f8d7727`, entry 659) — 12 rows flipped at the exact predicted delta.
  (3) Main worker: hold-item block bit-exact (`a4673f25`, entry 660) — 19
  rows flipped at the exact predicted delta; its 2-line
  `ENGINE_INFRA_SPELLINGS` addition is benign infra-name registration, not
  a counting-semantics change. (4) Side scout landed
  `docs/ability-item-speed-scout.md` (`f8aabadd`): census string-literal
  false-negative audit (10 members classified; generator fix described,
  deliberately NOT applied) + GetWhoStrikesFirst ground truth, consumer
  map, L50 fixtures with computed speeds, and 3 staged recipes.
- **Next (ordered):** (i) **Falsify the scout's RNG-gap hypothesis first**:
  `gRandomTurnNumber` (drawn once per turn in `BattleTurnPassed`,
  battle_main.c:4013) has zero engine footprint — but multi-turn staged
  windows pass RNG-exact, so `battleTurn.ts`'s `turnEndRngGroups` likely
  absorbs the draw unnamed. Run the scout's 2-turn no-Quick-Claw probe
  before trusting any Quick Claw fixture. (ii) Wire `turnOrder.ts`'s dead
  inputs (call site `factoryBattleScriptFullTurnDecision.ts:810` never
  threads ability/holdEffect/weather; weather already sits in
  `rulesContext.weather`) — closes Chlorophyll/Swift Swim semantically.
  (iii) Quick Claw row after (i). (iv) ON_DAMAGE contact family (Static 27
  et al.). (v) Census generator string-literal counting fix per scout §A3.
- **Notes:** ability rows still unreferenced are the speed pair (closes
  with ii), the ON_DAMAGE family, Run Away/Pickup (battle no-ops to prove),
  and trapping/AI-scoped rows. "Engine-referenced" still ≠ semantically
  complete — dense oracle evidence for the two damage blocks remains the
  standing follow-up; the scout pack's recipes are the template. No
  deferred questions this session.

---

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
