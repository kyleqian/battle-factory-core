# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1397 — [supervisor session, 2026-08-24 21:36 → IN PROGRESS] **#122 FIXED (check-viability recorder dropped a speed-tie draw), #123 closed NOT-A-BUG (stalemate is source-faithful), Refresh Rust port folded + wasm-parity green, animation folded, wip branch deleted; fifth gate measured (2,000 varied boot rounds, 0 CRASH) — shape lands once the `--first-round` mislabel fix merges**

- **State:** master = this docs commit on `ff1ddb8b` (ISSUES) ← `1dd081df`
  (#123 side fold) ← `95966ca5` (PAPERCUTS) ← `d6753f0b` (Refresh fold) ←
  `5582c407`/`fa06db1c` (#122) ← `4a8eec58` (animation fast-forward). Union
  at `4a8eec58`: `npm test` **1,111 files / 10,420 passed / 223 skipped**,
  build green; after #122 (worker's full run) **1,112 / 10,426 / 224**;
  after #123 fold (worker's full run) **1,112 / 10,422 / 223** + supervisor
  smoke 444/444 + pins. Refresh fold: union `cargo test` **1,036 passed /
  0 failed**, wasm rebuilt (511,638 B, sha `72b84af1…`), all 20 `*Parity*`
  suites under `POKEBENCH_ENGINE=wasm` **923 passed / 1 skipped** (#124).
  A side-lane worker (`worker/side-…`, 45-min cap from 22:54) is aligning
  `--first-round` outcome semantics; the deep full-chain varied census
  (`winning`/`winning-swap` `--vary-rng` carry 0, 0:100) is running.
- **Did:** (1) orient: `animation-main` fold was a fast-forward (the Codex
  animation supervisor, live concurrently, had merged master); oracle
  freshness FAIL judged client-only (last `oracle/` commit 08-15 09:51;
  8014 restarted 09:45 that same session, 8012 08-17) — not restarted.
  (2) **#122** (ts opus, 53 min): `runCvSemiInvulnerable` drew
  `GetWhoStrikesFirst`'s speed-tie `Random()` (`battle_main.c:4745` via
  `battle_ai_script_commands.c:1268-1274`) but returned only
  `tryEncourage`'s one-item list, so the lockstep recording was one draw
  short of the cursor. One-line carry, 7-case pin mutation-checked, seed 681
  now `OK b1 t12 roundLost`; 600:700 varied first-round 100/100. **#124
  filed**: the Rust mirror has the identical drop (one ts/wasm case
  `it.skip`ped) — Rust lane. (3) **#123** (side opus, 63 min): PP 15→0,
  `legalMoveBySlot` nulls the 0-PP slot, forced Struggle at selection 16
  (`battle_util.c:99-106`, `:1125-1140`); the "456 uses" were 15 DOUBLE
  TEAMs + 441 Struggles; +6/+6 Struggle (33%/29%) vs Leftovers/Ingrain regen
  never ends and Gen 3 has no turn cap → seed 755 is `OK … budget`. Pin
  `tests/factoryBattleScriptNoPpStruggleFullTurn.test.ts` (3× mutation-
  checked) + forced-Struggle transcript label; **#123 deleted, #125 filed**
  (soak-policy debt, filler). (4) **Refresh fold** `d6753f0b` (`81609f44`
  was in neither `rust-main` nor master; merge clean; verified above);
  nested worker worktree + branch removed. (5) `wip/mb-step2b-draft-heuristic`
  deleted (was `1f500a92`, 3 commits, program CLOSED 08-24). (6) PAPERCUTS:
  `--help` sweep trap hit 2, freshness false positive hit 9, new gate-cost
  vs 600 s ceiling entry. (7) **Fifth-gate census on the #122-fixed tree**
  (`winning --vary-rng --first-round`, 0:500 each): carry 0 **500/500**,
  carry 14 **498/500 + 2 HANG** (seeds 116/418 = the #125 stalemate,
  mislabelled HANG only because first-round mode returns HANG at budget),
  carry 28 **500/500**; `winning-swap` carry 0 **500/500**. 0 CRASH in
  2,000 varied boot rounds. Timing ~1 s/seed (0.9-1.1 s under load 22).
- **Next:** (1) verify + fold the first-round semantics worker; rerun seeds
  116/418 (expect `OK … budget`); (2) pin the fifth gate in SUPERVISOR.md +
  ROADMAP S10 soak block: `winning --vary-rng --first-round` at
  `--start-carry 0/14/28` + `winning-swap` at carry 0, `--seeds 0:100` each,
  `--render-every 0`; (3) deep census results → fix briefs if red; else
  filler; (4) wind-down: fold `animation-main` again (moved to `5a6ace87`+),
  all five gates concurrently under `nohup`, one full `npm test` + build.
- **Notes:** concurrent load: Codex animation supervisor + pokered-pewter
  supervisor on the same 16-core box (load 22 at start). Trap: a side
  worktree's root is the REPO root — run tests from `<worktree>/workspace`.
  DEFERRED.md: no open entries.

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

## 1395 — [interactive session, 2026-08-23] **Combined draft lever (4'') built + measured on a NEW honest instrument — challenge 4 was never unbeatable (winning 5.8%, combined 7.7% at n=1,000/arm); two policy/instrument bugs fixed, two engine finds filed (#122 crash, #123 endless battle)**

- **State:** master = this docs commit (4 code commits under it: `a8445d42`
  swap-decline fix, `83fa52af` `--policy winning-combined`, `679d1744`
  `--vary-rng`/`--first-round` instruments, plus this entry). Full gates on
  this tree: vanilla 0:20 **20/20**, full 0:60 **60/60**, winning 0:60
  **60/60**, winning-swap 0:60 **60/60** (0 CRASH / 0 HANG); `npm test`
  **1,107 files / 10,407 passed / 223 skipped** (+1 file / +11 tests);
  build + typecheck green.
- **Did:** (1) **Bug found+fixed before measuring**: `winning-coverage`
  never declined swap offers (missed the per-policy list written for
  `oracle-strength`; seed 0 accepted 64 offers and random-walked the swap
  screen — ISSUES-#99 trap class). Decline now keyed on `winningLike`,
  Tier-1-pinned; 1393's lever-4' numbers were of the buggy policy.
  (2) `--policy winning-combined` landed: coverage-first draft subject to a
  strength floor = the MEAN candidate-trio BST (6 pins, floor-binding pin
  mutation-red-verified). (3) **Instrument finding that reframes every
  `--start-carry` number to date**: the engine is seed-invariant, so
  deterministic-draft policies collapse all seeds into ONE trajectory (30
  identical chronologies), and even random-draft sweeps always faced the
  same six boot offers. Landed `--vary-rng` (per-seed boot RNG walk) +
  `--first-round` (direct roundComplete/roundLost at ~1 s/seed).
  (4) **THE MEASUREMENT** (carry 28, varied offers, boot-round wins):
  winning **58/1000 (5.8%)**, combined **77/1000 (7.7%)**, oracle-strength
  4/100, coverage 5/100 — challenge 4's "0/30 wall" was one losing deal
  measured repeatedly; the combined edge is suggestive-small (z ≈ 1.7),
  no draft policy separates decisively. (5) ~2,400 varied boot rounds of
  crash coverage → **#122** (Factory AI RNG-lockstep divergence crash,
  plain `winning`, deterministic 0.1 s repro seed 681) and **#123**
  (endless battle: 456 selections of a 15-PP DOUBLE TEAM then HANG, seed
  755) filed. Full results in
  `docs/soak-policy-strength-scout-2026-08-23.md` §"Result — lever 4''".
- **Next:** (1) triage #122 (cheapest first: which of the 13 expected draws
  diverged) and #123 (PP legality on the fallback path + Struggle
  engagement); (2) decide whether `--vary-rng` sweeps per `--start-carry`
  tier become a standing crash-coverage gate; (3) the draft-lever program is
  at diminishing returns — recommend closing it. Open ISSUES: #122, #123
  (new), #121 (dormant), #109/#114 (doubles-era), #71/#73/#39/#55
  (parked/filler).
- **Notes:** measurement is PAIRED (same walked offers per seed across
  arms); first 500 seeds: both-won 0, winning-only 26, combined-only 41;
  second 500: 32 vs 36 (no separation). The four standing gates stay
  UNVARIED (pinned baseline) — `--vary-rng` is opt-in. Trap: two glob
  collisions (`m-winning-*` matches `m-winning-coverage-*`) briefly
  produced a wrong count — use exact filenames when policy names share
  prefixes.

---
