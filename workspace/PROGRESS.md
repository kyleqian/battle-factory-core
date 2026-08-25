# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1398 — [supervisor, 2026-08-25 ~09:00, IN PROGRESS] **Orient: animation folded (fast-forward onto its own master-sync `dbe18b3d`; Screech exact, 208/276), union suite green; census batch A + #125 lever + premise-throw audit launched**

- **State:** master = `dbe18b3d` = `animation-main` tip. The live animation
  supervisor merged master `33592cba` into its branch at 08:48; my fold then
  fast-forwarded master onto that merge — one commit, both branches converge
  (4 animation commits folded: Screech Scene-ON exact + ratchets). `rust-main`
  had 0 commits to fold. Union `npm test` **1,125 files / 10,467 passed / 224
  skipped**; `npm run build` green. Both sibling Codex supervisors (animation,
  rust) are LIVE since 08:48 with 14:48 caps. Oracle freshness FAIL judged a
  false positive again (last `oracle/` commit 08-15 09:51 is client-side
  factoryBrain staging; only docs/engine commits since) — NOT restarted, the
  siblings are on the shared services. DEFERRED.md: no open entries.
- **Did so far (3 worker rounds):** (1) **Premise-throw audit** (ts opus
  ×2, 15.7 + 19.5 min, $10.4): `docs/premise-throw-audit-2026-08-25.md` —
  1,554 throw sites → 50 live-kernel premise-worded sites, ALL classified:
  **PROVED 10 / TS-CONTRACT 36 / UNPROVEN 4 / UNCLASSIFIED 0**. The first
  pass's top finding (Bide `CANCELER_BIDE` absent-target redirect, "Draft C")
  was **refuted by my own verification**: every `gAbsentBattlerFlags |=`
  site it cited sits in `Cmd_openpartyscreen`'s `HasNoMonsToSwitch` branch
  (`battle_script_commands.c:4865-5150`), never on faint — the port's
  invariant holds; the second pass then refuted Drafts B/D/E on evidence.
  Survivors: **#127 filed** (Baton Pass → Spikes KO → second
  `openpartyscreen` inside the #89 mid-action resume → throw at
  `factoryBattleScriptFullTurnDecision.ts:2564`; the #119 dance path already
  republishes the same halt) and a #121 lead (two more `monToSwitchIntoId`
  lifecycle writes). (2) **#125 lever 1** (side sonnet, cap-killed at 45
  min under load ~40 with the work committed: `a030faf9` → merge
  `3b96ceb6`): maxed-stat-stage status slots skipped in the winning-like
  fallback, 3 pins mutation-checked, carry-14 fifth gate 500/500 (`budget`
  2, unchanged) — necessary, not sufficient: seed 116's transcript shows
  FIGHT → Struggle for 1,700 turns with every slot at 0 PP; #125 trimmed to
  lever 2 (switch when no usable PP). (3) Census batch A (six `--vary-rng`
  full-chain sweeps, `--render-every 64`, 0:100 each — winning-swap c14/c28,
  winning-coverage c0/c14, full c0/c14): in flight, 0 CRASH / 0 HANG so far.
- **Did (rounds 4-5):** (4) **#127 FIXED** (ts opus, 48 min, $5.1;
  `f018c5b8` fix + 3 mutation-checked pins + lab scenario, `6f1d4717`
  ground truth): the stock ROM DOES open the party screen twice inside one
  Baton Pass action (`playerControllerCommand` 22 at frames 880 and 2220,
  no turn boundary; recipe: Aipom Swords Dance → Cloyster SPIKES ×4 → Baton
  Pass to Shedinja, whose 1 max HP makes any layer lethal — real damage
  only); the #89 resume now republishes the second forced switch like the
  #119 dance path; passed stages do NOT chain past the KO; second switch
  spends no RNG. Full suite 1,126 / 10,473 / 224 on `f018c5b8`, build green.
  **#127 deleted.** (5) **Soak coverage instrument** (side opus, killed by
  a sibling's pattern kill — see below — with the work committed
  `91938de7` → merge `4aa81ff5`): `--coverage-json` aggregates executed
  moves/effects (from `STRINGID_USEDMOVE` resolution receipts, both sides),
  species seen, abilities/items PRESENT at battle start, vs the L50 corpus
  (740 sets: 276 moves / 166 effects / 264 species / 71 abilities / 40
  items); 8 pins. Demos: 50 `winning-coverage --first-round` seeds → moves
  169/276, effects 110/166, species 134/264; 5 `winning` full chains →
  **223/276 moves, 139/166 effects, 155/264 species, 64/71 abilities, 36/40
  items**. One tsc error in its test (vitest does not typecheck) fixed by me
  (`ba325c4b`).
- **Incident:** the #127 worker ran `pkill -f "randomRoundSoak"` three
  times (10:08/10:23/10:33) to stop its own over-long gates; the pattern
  killed all ten in-flight census sweeps AND the coverage worker (its brief
  text matched; SIGTERM 143 at 23 of 50 min). Batch A's four winning-like
  sweeps stood at 83/100 each, 0 CRASH / 0 HANG; batch B at 12-20 seeds.
  Relaunched from the last completed seed at 10:37; three PAPERCUTS entries
  (`bfc91c90`); briefs now forbid pattern kills and cap soak runs at ~3 min.
- **Did (rounds 6-7):** (6) **#125 lever 2** (side sonnet, 19.7 min,
  $1.4; `54ad24a7` → merge `4dbe8fe9`): the winning-like switch path
  (`pickWinningSwitchRow` C2) now also fires on forced Struggle (every slot
  0 PP) whenever a bench mon has a usable non-immune damaging move; 3
  mutation-checked pins; seeds 116/418 (`winning --vary-rng --first-round`
  c14) and 755 (`winning-combined` c28) go `budget` → `roundLost` (my
  rerun agrees); carry-14 first-round 0:100 **100/100, budget 0** (was 2).
  **#125 deleted.** Trajectory re-baseline → all gates rerun at wind-down.
  (7) **`--parallel N` seed fan-out** (ts opus, 20.7 min, $2.8; `b16e9009`):
  `randomRoundSoak.ts` spawns N contiguous-slice children, prints per-seed
  lines in seed order, merges `--json`/`--coverage-json`
  (`mergeCoverageReports`), summary lifted into `printSoakSummary`; 6+4
  pins incl. serial-vs-parallel deep-equality (mutation-checked); default 1
  byte-identical. Measured 38.0 s → 21.6 s at `--parallel 4` under load 62
  (contended floor); full suite 1,128 / 10,487 / 224 on `b16e9009`.
  Census batch A COMPLETE: **600/600 varied full chains, 0 CRASH / 0 HANG**
  (winning-swap c14/c28, winning-coverage c0/c14, full c0/c14; 83:100
  tails rerun after the pattern kill).
- **In flight:** side opus — `--policy coverage-fight` (least-used legal
  move first; stacked on lever 2, `worker/side-20260825-105948`); census
  batch B (~350 chains with coverage) — ETA ~12:15.
- **Next:** fold coverage-fight → first-round census with it at c0/c14/c28;
  union coverage report over batch B; mid-session gates with `--parallel`;
  wind-down: five gates + full suite on the final tree.

---

## 1397 — [supervisor wind-down, 2026-08-25 ~02:35] **Mission queue CLOSED + two bonus finds fixed: #122 (check-viability recorder dropped a speed-tie draw), #123 NOT-A-BUG (source-faithful Struggle stalemate), Refresh Rust port folded (cargo 1,036 + wasm parity), fifth varied-RNG gate PINNED (2,000/2,000 baseline), `--first-round` HANG-at-budget mislabel fixed, #126 (Bide ignored end-turn `HITMARKER_IGNORE_BIDE`) found by the first varied full-chain census and fixed; animation folded twice; all five gates green on the final tree**

- **Final gates on THIS tree (`dae00750` = engine tree of the five gates; final tree `94da116c` = animation fold #3 on top (Scene-ON only), full suite + build rerun there` + this docs commit; supervisor's own runs,
  all eight sweeps concurrent under `nohup`):** vanilla 0:20 **20/20**,
  full 0:60 **60/60**, winning 0:60 **60/60**, winning-swap 0:60
  **60/60**; fifth gate — winning `--vary-rng --first-round` carry 0
  **100/100**, carry 14 **100/100**, carry 28 **100/100**, winning-swap carry 0
  **100/100**. Full `npm test` **1,116 files / 10,442 passed / 224 skipped on `dae00750`; 1,121 / 10,456 / 224 on the final `94da116c`**; `npm run build` green.
  DEFERRED.md: no open entries. `animation-main` folded three times: `4a8eec58`
  (fast-forward), `dae00750` (4 commits), `94da116c` (7 commits, 66 files —
  Scene-ON draw cases in `battleScene.ts` + animation-lane files); its Codex
  supervisor was live all session — anything it lands after 02:35
  folds at the next orient.
- **Did (4 worker rounds — 2 ts opus, 2 side opus — all verified green, 0
  failed, 0 cap-kills, ~$29 worker spend):** (1) **#122** ts opus 54 min: `runCvSemiInvulnerable` drew
  `GetWhoStrikesFirst`'s speed-tie `Random()` (`battle_main.c:4745` via
  `battle_ai_script_commands.c:1268-1274`) but returned only `tryEncourage`'s
  fresh one-item list — recording one draw short of the cursor. One-line
  carry `fa06db1c` + 7-case mutation-checked pin; seed 681 `OK b1 t12
  roundLost`. **#124 filed** (Rust mirror has the same drop; one ts/wasm
  case `it.skip`ped — Rust lane). (2) **#123** side opus 63 min: PP 15→0,
  `legalMoveBySlot` nulls 0-PP, forced Struggle at selection 16
  (`battle_util.c:99-106`, `:1125-1140`); "456 uses" = 15 + 441 Struggles;
  +6/+6 Struggle (33%/29%) vs Leftovers/Ingrain regen never ends, no Gen-3
  turn cap → `OK … budget`. Pin `factoryBattleScriptNoPpStruggleFullTurn`
  (3× mutation-checked) + forced-Struggle transcript label `1dd081df`;
  **#123 deleted, #125 filed** (soak-policy debt, filler). (3) **Refresh
  fold** `d6753f0b` (`81609f44`, in neither `rust-main` nor master): union
  `cargo test` 1,036/0, wasm rebuilt (511,638 B `72b84af1…`), 20 `*Parity*`
  suites under `POKEBENCH_ENGINE=wasm` 923 passed / 1 skipped. (4)
  **`--first-round` semantics** side opus 19 min `359505a9`: the branch
  returned HANG at budget unconditionally, mislabelling the #125 stalemate
  (seeds 116/418 at carry 14); now in-loop stall check + `OK … budget`,
  summary prints `budget n`, 3 pins. (5) **Fifth gate pinned** `acb59111`
  (SUPERVISOR.md + ROADMAP S10 block): baseline 0:500 per sweep on
  `1dd081df` — winning c0 500/500, c14 500/500 (2 `budget`), c28 500/500,
  winning-swap c0 500/500; ~1 s/seed. (6) **First varied FULL-chain census**
  (`--vary-rng`, 0:100 × {winning c0/c14/c28, winning-swap c0}): 399/400 —
  the one CRASH was **#126**: Metronome→Bide, release `throw` "gBideTarget
  must be the opposing slot" — a premise. ts opus 32 min `ab9c158b`:
  `DoBattlerEndTurnEffects` raises `HITMARKER_GRUDGE|IGNORE_BIDE` at every
  entry (`battle_util.c:1468`), so Bide never stores end-turn damage;
  oracle-staged (Shelgon Bide vs Poison Powder: `gBideDmg` 0, release =
  `BideNoEnergyToAttack` ×3); throw dropped, target read verbatim
  (`battle_util.c:2236`); 4 pins mutation-checked; seed 69 `OK … budget`;
  **#126 deleted**. (7) `wip/mb-step2b-draft-heuristic` deleted (was
  `1f500a92`). (8) PAPERCUTS: `--help` sweep hit 2, freshness false
  positive hit 9, +3 entries (gate cost vs 600 s ceiling; manifest line
  locators; repo root ≠ `workspace/`). Deep depth on varied chains: carry
  ≥ 28 reached 4-8/100 at carry 0/14; carry 42 from carry 28.
- **Next:** (1) **#124** is the Rust lane's (mirror the one-line carry,
  regenerate the m5d3 vectors, rebuild wasm, un-skip the case); (2) more
  varied full-chain census is the cheapest crash finder left
  (`winning-swap --vary-rng` at carry 14/28, wider seed ranges) — file, then
  fix; (3) filler: #125 (fallback skips a maxed stat-stage move; re-baselines
  winning/winning-swap trajectories), #71/#73/#39/#55 (parked), #121
  (dormant), #109/#114 (doubles-era). S11 stays OUT OF SCOPE (user 08-10).
- **Notes:** oracle freshness FAIL judged client-only (last `oracle/` commit
  08-15 09:51; 8014 restarted 09:45 that same session, 8012 08-17) — not
  restarted because the Codex animation supervisor was live on the shared
  services; the pokered-pewter Codex supervisor also ran all night (load
  ~20 on 16 cores; soak ~1.5-2× slower). Traps: a side worktree's root is
  the REPO root (`<wt>/workspace` for tests/paths); `git branch --list`
  prefixes worktree-checked-out branches with `+`. Reduced soak canary rerun on the final `94da116c` (03:01): vanilla 0:20 **20/20**, fifth gate **100/100 × 4** (the three 0:60 deep gates stand on `dae00750`; the fold between them is Scene-ON-only). At close `animation-main` is 4 commits ahead again (its supervisor was still live) — fold at the next orient.

---

## 1396 — [top-layer setup session, 2026-08-24] **Two user decisions recorded + next-supervisor mission staged: draft-lever program CLOSED, varied-RNG standing gate ADOPTED (shape defined after the #122/#123 fixes); orphaned Rust Refresh-port worker commit found unfolded**

- **State:** docs-only commit on top of 1395's fully-gated tree (no
  `src`/engine edits at this layer). Oracle services verified live: main
  8012 (`bin/oracle info` answers), animation 8014, node harness 8001.
  DEFERRED.md: no open entries. Tree was clean at audit start.
- **Did (top-layer audit of what the next supervisor inherits):**
  (1) **User decision:** the draft-lever program is CLOSED — 1395's
  `--vary-rng` measurement settled it (challenge 4 was one losing deal, not
  a wall; the best lever gains ~2 points, z ≈ 1.7, no policy separates
  decisively). `winning-combined` stays available opt-in; no further
  draft-axis measurement sessions. (2) **User decision:** varied-RNG crash
  sweeps BECOME A STANDING WIND-DOWN GATE — adopted in principle
  2026-08-24; the supervisor defines the exact shape (carry tiers × seed
  count) AFTER #122/#123 are fixed and pins it in SUPERVISOR.md next to the
  four existing gates (which stay unvaried). (3) **Found: orphaned worker
  commit** — `worker/rust-20260822-123947` (`81609f44`, "Port Refresh
  battle script opcode to Rust": impl + 36k-line vectors + tests, Codex
  sol/high, 2026-08-22 12:49) is in NEITHER `rust-main` NOR master; it
  predates that day's night session and was never folded.
- **Next (the supervisor mission, in order):** (1) fold `animation-main`
  (9 commits, idle since 08-23 03:21) at orient; (2) triage + fix **#122**
  (start: which of the 13 expected draws diverged at draw 11) then **#123**
  (PP legality on the fallback path + Struggle engagement); both repros are
  in ISSUES.md (0.1 s and ~27 s, deterministic); (3) define + land the
  varied-RNG gate, pin its text in SUPERVISOR.md, record baseline counts;
  (4) verify (cargo + wasm parity) and fold-or-discard the Refresh worker
  branch, with the reason recorded; (5) delete
  `wip/mb-step2b-draft-heuristic` (program closed; git retains). Open
  ISSUES after this queue: #121 (dormant), #109/#114 (doubles-era),
  #71/#73/#39/#55 (parked/filler).
- **Notes:** a Codex supervisor for a DIFFERENT repo (`pokered-pewter`)
  holds an 8 h cap until ~04:40 on 08-25 — expect CPU contention for soak
  sweeps if this repo's supervisor launches before then. The four standing
  gates stay UNVARIED baselines; the new gate is additive crash coverage,
  not a replacement. 1395's trap reminder stands: use exact filenames when
  policy names share prefixes (`m-winning-*` glob collision).

---
