# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

## 1394 — [supervisor final wind-down, 2026-08-23 03:10] **Bonus round closed: both remaining challenge-4 levers measured NEGATIVE at carry 28 (`oracle-strength` 0/30, `winning-coverage` 0/30); final tree re-gated green — entry 1392 is the full session record**

- **Final gates on THIS tree (`b1480863` + this docs commit; supervisor-independent):**
  vanilla 0:20 **20/20**, full 0:60 **60/60**, winning 0:60 **60/60**,
  winning-swap 0:60 **60/60** (0 CRASH / 0 HANG); full `npm test`
  **1,106 files / 10,396 passed / 223 skipped**; `npm run build` green.
  (Gates were also green at `0cabb82b`, `a5b06cfb`, and — vanilla/winning —
  `77f4db64`; see 1392.)
- **Did since 1392:** worker J landed opt-in `--policy winning-coverage`
  (1393): 0/30 rounds won at carry 28 (29 lost at b1 — coverage-first starves
  bulk, the mirror of the withheld bulk+STAB heuristic), anchor 0:120 carry
  ≥ 28 **10/120** (8.3% vs `winning` 3.75%, suggestive only), ≥ 35 0/120.
  With `oracle-strength` (1391) also at 0/30, move choice AND single-axis
  draft scores are both retired as challenge-4 levers. One cross-lane stray
  (an animation worker's edit to `tests/animation/glareEvidence.test.ts`
  landed in this tree at 01:49) was saved as a patch and reverted
  (PAPERCUTS hit 6).
- **Next (for the next session / the user):** the only lever left for
  natural deep play is a COMBINED draft score with a strength floor
  (coverage subject to BST ≥ floor), measured by rounds won at
  `--start-carry 28 --seeds 0:30` — or accept that `--start-carry` already
  covers challenge 5-8 for crash coverage and stop here. Instruments from
  the scout §4 (per-seed round ledger, loss shape, rentsCount/rank) would
  make that measurement cheap. Open ISSUES: #121 (dormant note), #109/#114
  (doubles-era), #71/#73/#39/#55 (parked/filler). DEFERRED.md: none open.
- **Notes:** `animation-main` ahead of master at close: 7 commits (its
  supervisor was live all night; folded twice this session at `3a8b58d7` +
  `77f4db64`; the remainder folds at the next orient). `rust-main` ahead: 0.
  11 worker rounds total (6 ts opus, 5 side), 0 failed steps, 0 cap-kills,
  0 regressions folded. Trap of the hour: an UNQUOTED heredoc fed ledger
  prose to zsh, which executed its backticked `npm test` — quote heredocs
  (`<<'EOF'`) or write files with a tool.

---

## 1393 — [main worker, 2026-08-23] **Scout lever 4' built and measured: `--policy winning-coverage` (coverage-first 3-of-6 draft) wins 0/30 rounds at carry 28 — challenge 4 stays unbeaten — but reaches carry >= 28 in 10/120 at the anchor vs `winning`'s 18/480**

- **State:** master `2ea18c0b` + this docs commit. `npm test` **1,106 files
  / 10,396 passed / 223 skipped** (this step adds 1 file / 4 tests; the rest
  of the delta over 1392's 1,105 / 10,392 came in with that entry's own
  animation fold), `npm run build` + typecheck green. New opt-in soak policy
  only — `winning` / `winning-swap` / `full` / `vanilla` / `oracle-strength`
  untouched (all their pins still pass); zero `src/engine` edits.
- **Did (`b00f7e60` policy+pins, `2ea18c0b` measurement):**
  `--policy winning-coverage` = `winning` except the draft, which rents the
  3-of-6 maximising lexicographic (offensive coverage weighted by the six
  offers' own types, defensive diversity − shared 4x weaknesses, BST as a
  pure TIEBREAK). Deterministic, no RNG; the shuffle/decline rolls are still
  drawn so the stream stays aligned with `winning`. **Measured:** smoke 0:20
  **20/20 OK**; `--start-carry 28` 0:30 **0/30 rounds won** (same as
  `winning` and `oracle-strength`) with a WORSE loss shape — **29/30 lost at
  b1** vs both baselines' 22/30; anchor 0:120 **120/120 OK**, carry ≥ 21
  39/120, **carry ≥ 28 10/120 (8.3%)** vs `winning`'s 18/480 (3.75%), **carry
  ≥ 35 0/120** (baseline 0/480). Full numbers + commands in
  `docs/soak-policy-strength-scout-2026-08-23.md` §"Result — lever 4'".
- **Next:** every single-axis draft lever is now spent — 4 (bulk+STAB)
  starved coverage, 4' (coverage-first) starves bulk, and the two failure
  modes are mirror images, so the only lever left for challenge 4 is a
  COMBINED draft score (coverage maximised subject to a minimum trio BST),
  measured the same way (`--start-carry 28 --seeds 0:30` rounds won). Also
  still open: the scout §4 instruments (per-seed round ledger, loss shape,
  rentsCount/rank) ~40 lines in the driver. Open ISSUES: #121 (dormant
  note), #109/#114 (doubles-era), #71/#73/#39/#55 (parked/filler).
- **Notes:** soak chunking deviates from the brief only in chunk COUNT (2x10
  for the smoke, 8x15 for the 0:120) — the Bash foreground cap is 600 s and
  seeds are independent per `runSeed`, so the unions are the requested
  `0:20` / `0:120`. Tree clean, no foreign animation strays this session.

