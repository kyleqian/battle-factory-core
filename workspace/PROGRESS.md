# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-06 (day) — S10A wind-down: D3 implemented; 218 -> 226 exact + 10 faithful-random live adapters

- **State:** S10A, local master; production `7e7816b98` (src tree `c41c4949`): 226 scoped-exact + 10
  faithful-random live adapters, 40 accepted bodies remain (6.1% of Factory move uses; census
  `226+10+0+40=276`). Supervisor final gates on that code: typecheck, 1,536 files / 12,472 tests, build
  857 (`final-supervisor-gates-20261006.json`). Preview <http://127.0.0.1:5191/> serves `10ad8606c`
  (same src; 4 samples hash-equal, export + mode restart pass, no errors). Opus 5.5 supervisor;
  Opus/Sonnet 5.5 workers; 8 integration folds + 12 evidence merges, all re-proved by the supervisor.
- **Did (production):** D3 option (a): presentation-only Random2 host (`docs/presentation-rng.md`; seed +
  policy in session exports; legacy default) and a separate faithful-random bucket. Faithful-random:
  Double Kick, Astonish, Thrash, Flail, Wish, Hyper Beam, Rain Dance, Water Pulse, Mud-Slap, Sand-Attack.
  Exact: Ice Beam, Water Spout, Hidden Power (Unown forms), Hail, Overheat (first body), Silver Wind,
  Psych Up (player), Dig. Battler x2 history tracker (#148: ONIX/RATTATA later bodies), assets-only palette
  composite, first-body gate, Rollout Defense Curl bodies, #149 audit fixes, Endeavor stale-register
  plumbing (no adapter yet). Gameplay/RNG unchanged (route ON/OFF + seed parity per batch; 20 soak seeds
  identical master vs the register branch).
- **Did (evidence):** census regen; prep12-20 (Random2 plans — most "C" labels were stale; Meteor Mash tail
  = ROM lag frame -> fallback; BG-register history; OAM assemblers for Will-O-Wisp / Pursuit / Fury Cutter /
  Megahorn); species audits 3 (3 defects, fixed) and 4 (clean).
- **Next:** ROADMAP S10A "Next (2026-10-06 evening)": OAM-buffer reducer ports first (prep20), then Overheat
  later bodies, Endeavor adapter, remaining stale-labelled Random2 moves.
- **Notes:** no DEFERRED entries. Optional user question (not blocking, not filed): Meteor Mash's last-row
  timing depends on a ROM lag frame; it stays on fallback unless a D3-like timing claim is approved. A
  worker's `pkill -f mgba` killed both oracles mid-session; restarted 11:29 (PAPERCUTS). Soak gates are
  superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged, worktrees removed;
  validation summaries copied to `.integration/validation/`.

---

## 2026-10-06 — D3 approved; next run implements faithful random animations

- **State:** D3 answered with option (a). Production remains `24df8af5e`:
  218 live adapters, 58 remaining (52 Random2); no surrogate adapter credit yet.
- **Did:** recorded the user's approval, removed the open D3 launcher block,
  and aligned ROADMAP S10A, worker instructions and verification. The next
  Opus/Sonnet run may implement a separate deterministic presentation RNG,
  persist its seed in session exports and report "faithful random" separately.
- **Next:** presentation RNG + replay/export metadata + claim accounting;
  then Double Kick/Astonish as a bounded representative batch, source-verified
  with pinned words and ordinary seeded routes. Continue other exact adapters
  and outstanding fixes as the current roadmap directs. Do not re-ask D3.
- **Checks:** docs-only diff/ledger checks and resolved launch profile; no open
  deferred headings. Reuse unchanged final production receipt: typecheck,
  1,525 files / 12,317 tests, build851 (`final-supervisor-gates-20261005-day.json`).
- **Notes:** gameplay RNG/outcomes stay unchanged; controlled pinned-word
  proofs do not turn normal-play surrogate randomness into an exact claim.
  This checkpoint prepares the next run and launches no supervisor or worker.

---

## 2026-10-05 (day) — S10A wind-down: 198 -> 218 live adapters; lends across faints/switches; 8 species fixes; elevated renderer

- **State:** S10A, local master; production `24df8af5e` (218 live adapters, 58 accepted bodies
  remain: 52 Random2 + 6 others). Supervisor final gates on that code: typecheck, 1,525 files / 12,317 tests, build 851 (`final-supervisor-gates-20261005-day.json`). Preview
  <http://127.0.0.1:5191/> serves `24df8af5e` (four hashes, export, ON->OFF, no errors) (receipt in `tools/integration/fixtures/`). Opus 5.5
  supervisor; Opus/Sonnet 5.5 workers; 13 integration folds + 15 evidence merges, all re-proved.
- **Did (production):** sprite-order tracker kept and LENT across opponent KOs (entry-label relabel),
  player faints + forced switch-in and voluntary switches / cancelled menus (role relabel), Roar /
  Whirlwind forced switches; allocator re-seeded; +22 order rows (467 bodies). Adapters: Magnitude,
  Reversal, Pain Split, Rock Blast, Razor Wind, Spark (player) with gBattleMovePower on the request;
  Leech Seed, Tri Attack, Petal Dance, Destiny Bond, Air Cutter, Foresight, Sky Uppercut, Recycle,
  Spider Web; Roar, Whirlwind (Scene-ON instant forced removal); Fly, Bounce (attacker hidden across
  the turn gap); Rollout (counter on the request; Defense Curl bodies decline). Species fixes from swap audits: Leaf Blade, Dragon Rage, Aerial Ace, Rock Throw,
  Smelling Salt, Light Screen / Future Sight end shadow, Foresight (#144 closed, #145 trimmed).
  ISSUES #147: elevated opponents were drawn 8 px low without shadow in ordinary resolution frames
  in BOTH scene modes — fixed (Scene OFF 0/935 -> 919/935; 203 committed traces unchanged).
- **Did (evidence):** post-KO / player-faint / voluntary-switch audits, census regen, prep10/11,
  Random2 trackability (NOT trackable), forced-switch continuation (#146), live species audits 1+2,
  elevated post-body + Scene OFF checks, Rollout/Endeavor prep (both trackable), send-in tail model
  (338/338).
- **Next:** ROADMAP S10A "Next (2026-10-05 day)": D3 answer first; then Endeavor, Baton
  Pass, #146 send-in tail (model ready), #145/#147 remainders, order-coverage gaps.
- **Notes:** **DEFERRED D3 (OPEN):** Random2 animations (52 moves) cannot be tracked exactly in play;
  ship a surrogate presentation RNG in a separate claim bucket (recommended) or keep the fallback.
  The next `run-supervisor.sh` refuses to start until D3 is answered. Soak gates superseded for
  S10A integration work (ANIMATION_VERIFICATION scoped policy). All worker branches merged and
  worktrees removed; evidence summaries copied to `.integration/validation/`. A side worker once
  committed onto master via the shared `/workspace` path suffix and self-repaired (PAPERCUTS).

---
