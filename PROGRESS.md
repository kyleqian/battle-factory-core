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


## 663 — [BOUNDED MAIN WORKER 2026-07-28 ~21:55] production turn-order inputs live; Swift Swim + Chlorophyll census rows closed

- **State:** tree green at **452 files / 4862 tests**, production build,
  `git diff --check`, and Battle Scene OFF oracle info. Census regenerated
  byte-idempotently: **abilities 57/70 engine-referenced (weighted
  977/1103)**, hold effects unchanged **41/42 (775/850)**; all 15
  validations pass. This matches the assigned prediction exactly.
- **Did:** wired `factoryBattleScriptFullTurnDecision.ts`'s sole production
  `GetWhoStrikesFirst` call with both battlers' numeric ability → shared
  `ABILITY_SYMBOLS` name, existing hold-effect/param resolvers → the shared
  hold-effect name map (extended with Macho Brace id 24), real STATUS1
  paralysis, and `rulesContext.weather`. Rain/sun decoding is suppressed by
  the already-established end-turn `weatherHasEffect` Cloud Nine gate; no
  duplicate ability/item/weather table was added. Six real full-turn tests
  pin Swift Swim, Chlorophyll, opposing Cloud Nine, paralysis, Macho Brace,
  and the existing one-draw-only speed-tie contract. Census identity aliases
  close exactly the two assigned ability rows.
- **Next:** keep the supervisor's order: falsify the scout's two-turn
  `gRandomTurnNumber` gap before implementing Quick Claw; then choose Quick
  Claw or the ON_DAMAGE contact family.
- **Notes:** source citations were re-read. ROM `WEATHER_HAS_EFFECT` also
  requires `hp != 0`; this is vacuous at action selection because the
  full-turn reducer resumes only after fainted-actions installs live singles
  actives. The paralysis call-site path has 9 draws by design: 8 ordinary hit
  draws plus its existing attack-admission paralysis roll, and no turn-order
  draw (an erroneous tie would make 10). No generator semantics, canonical
  replay, oracle fixture, Quick Claw, AI, or `unsupported-branch` ratchet
  changed. Scout/probe files untouched. PAPERCUT: none this session.

---

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
