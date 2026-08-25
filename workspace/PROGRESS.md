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
- **In flight:** (1) side sonnet — ISSUES #125 fallback lever
  (`worker/side-20260825-085458`, cap 45); (2) ts opus — premise-throw audit
  of the battle kernel (#126 class: `throw`s that encode a premise instead of
  an oracle-proved barrier) → `docs/premise-throw-audit-2026-08-25.md`, new
  file only (cap 50); (3) census batch A under `nohup`, default render cadence:
  `--vary-rng` full chains 0:100 for winning-swap carry 14/28,
  winning-coverage carry 0/14, full carry 0/14 (all new dimensions vs 1397's
  winning c0/c14/c28 + winning-swap c0).
- **Next:** verify + fold both workers; file then fix any census CRASH (ts
  lane); batch B = wider seeds (100:300) on 1397's four sweeps + the audit's
  top UNPROVEN rows staged live; wind-down: five gates + full suite.

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
