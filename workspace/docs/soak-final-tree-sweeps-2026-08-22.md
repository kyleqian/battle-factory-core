# Final-tree soak sweeps (2026-08-22, supervisor)

Engine tree `3ab975e7` (every fix of this session folded: #102 both halves, #106-#108, #110-#113,
#115; #117 and the `winning-swap` policy landed later but cannot change these policies' play).
Clean throwaway worktree, render off, default per-policy budgets, 3-4 parallel chunks each.

| policy | seeds | OK | CRASH | HANG | carry ≥ 7 | ≥ 14 | ≥ 21 | ≥ 28 |
|---|---|---|---|---|---|---|---|---|
| vanilla | 0:240 (session-start tree `cd59eeec`) | **240** | 0 | 0 | 240 | 0 | 0 | 0 |
| full | 0:240 | **240** | 0 | 0 | 12 | 0 | 0 | 0 |
| full | 240:480 | **240** | 0 | 0 | 15 | 0 | 0 | 0 |
| winning | 0:240 | **240** | 0 | 0 | 240 | 214 (89.2%) | 53 (22.1%) | 9 (3.75%) |
| winning | 240:480 | **240** | 0 | 0 | 240 | 211 (87.9%) | 58 (24.2%) | 9 (3.75%) |
| winning (n=180, `96a64a8e`) | 0:180 | 180 | 0 | 0 | 180 | 163 | 40 | 4 |
| winning-swap (`255d682c`, worker) | 0:120 | 120 | 0 | 0 | 120 | — | 31 (25.8%) | 5 (4.2%) |
| winning-swap (`28c993b5`, supervisor) | 120:360 | 239 | **1** (seed 130 → #119, fixed `dbf6f64a`) | 0 | 240 | 232 | 46 (19.2%) | 11 (4.6%) |
| winning --start-carry 28 / winning-swap --start-carry 35 / winning --start-carry 42 (worker, `c89e3087`) | 0:60 / 0:40 / 0:60 | 60 / 40 / 57 | 0 / 0 / 3 (#118, challengeNum 8) | 0 | — | — | — | max carry 28 / 35 / 49 |

**Session delta.** Session start (`cd59eeec`): `full` 0:240 = 236/240 (#102, #108, #112, #113
signatures), `winning` 0:240 (08-20 tree) = 238/240 (#102, #106). Session end: **`full` 0:480 =
480/480, `winning` 0:480 = 480/480, `vanilla` 0:240 = 240/240 — 1,200 seeded continuous-play runs,
0 CRASH, 0 HANG.** The two NEW opt-in instruments then found the next two walls in 400 more runs:
#119 (swapped party + 3-layer Spikes → second forced choice in one script run; fixed same session)
and #118 (challengeNum 8 retail table overread; bytes pinned, port coupled to Rust — next session). Depth shape unchanged by the fixes (carry ≥ 28 ≈ 3.75% either way): the
fixes removed crashes, they did not move the policy's ceiling — see
`docs/soak-deep-sweep-2026-08-22-4M.md` for why that ceiling is the challenge-5 AI tier.

**Caveats carried from this session's findings:** `vanilla` is one trajectory (ISSUES #116);
every policy's first round is the anchor draft, so "carry ≥ 7 = 100%" is anchor-biased; transcript
round tables cannot tell a battle-7 loss from a round win — the driver's `maxCarriedWinStreak`
is the carry source of record.

**Post-wind-down addendum (final tree `70236e03`):** `winning --start-carry 28` seeds 60:150 → 90/90 OK
(all at carry ≥ 28 by construction); `winning-swap` seeds 360:520 → 160/160 OK (carry ≥ 28 in 8/160).
Session totals: 1,200 + 400 + 250 = **1,850 seeded continuous-play runs on this session's trees; the only
crashes were the four fixed today (#102/#108/#112/#113 at start, #119 mid-session) and #118's
challengeNum-8 guard.**
