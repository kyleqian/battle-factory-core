# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-06 (in progress) — S10A: presentation RNG merged; Random2 draw plans measured

- **State:** S10A, local master `cce4739da`+. Scoped-exact live adapters 222; faithful-random
  adapters 8 (Double Kick, Astonish, Thrash, Flail, Wish, Hyper Beam, Rain Dance, Water Pulse). Preview
  <http://127.0.0.1:5191/> serves `4abe570f9` (browser replay 4 samples, export + mode restart pass,
  no errors; `playable-preview-4abe570f9-receipt.json`). Opus 5.5 supervisor; Opus/Sonnet 5.5 workers.
- **Did:** D3 option (a) infrastructure merged (Opus worker): `src/engine/presentationRng.ts`
  (exact Random2 LCG + jump-ahead), per-battle host `presentationRngHost.ts` (policy
  `presentation-rng.v1.frame-step.no-lag.battle-stride-2^20`; session seed from crypto /
  `presentationSeed=` / bench default 0x808DB3EB; one step per presented battle frame, draws
  exactly once per body key, render read-only), `SessionTrace.presentationRng` export with legacy
  default, `faithfulRandomCount`/`faithfulRandomAdapters` disjoint from `implementedCount`; doc
  `docs/presentation-rng.md`. Worker gates 1,527 files / 12,335 tests, build 853; supervisor
  differential 408/408 byte-identical vs `e45e9c361`, affected tests 42/42, smoke 448 on master.
  prep12 (side): census regenerated (218 + 0 + 58 = 276; 52 Random2); draw plans for 12 moves
  reproduce the accepted pinned words exactly (`tools/integration/fixtures/prep12-random2/plans.json`);
  Ice Beam / Water Spout / Hidden Power draw NO Random2 (stale C label). Supervisor reran Thrash and
  Wish probes twice: per-frame hashes equal the receipts.
  R1 (Opus) merged: faithful-random adapters via `src/engine/liveMovePresentationRng.ts` (activation
  in tick, body key per request/segment/command, render read-only); pinned dense proofs both
  orientations + alternates zero residual; supervisor reran 4 fixtures twice fresh (0 px) and the 5
  surrogate routes (active every age, prompt reached, seed + ON/OFF logical parity). Meteor Mash
  dropped (alternate body is 1 frame longer). prep13 merged: Ice Beam / Water Spout / Hidden Power
  (no RNG) + Hyper Beam briefable. ISSUES #148 filed (target x2 after a shaking body).
  R3 (Sonnet) merged: Ice Beam, Water Spout, Hidden Power (Unown letter-form coords) exact; Hyper
  Beam faithful-random; supervisor reran 4 alternates twice fresh, 0 px. Water Spout middle HP tiers
  (later bodies) unproven: the tier fixtures lend the first-body order. prep14 (Rain Dance + Water
  Pulse Random2-ready, Hail no RNG, Overheat/Silver Wind need palettes, Psych Up/Curse later) and the
  #148 evidence (only ONIX/RATTATA opponents have idle x2 1; per-move reset table; rule == ROM
  1,927/1,944 activations) merged. Both oracles were killed by a worker's `pkill -f mgba` and
  restarted by the supervisor at 11:29 (PAPERCUTS).
  R4 (Sonnet) merged: Rain Dance + Water Pulse faithful-random, Hail exact; supervisor reran 6 fixtures
  twice fresh (0 px) and 3 routes. prep16 merged: Overheat/Silver Wind first bodies exact with palettes
  composed from existing assets (230/230; 193-196/196); later bodies need a BG-register tracker.
- **Next:** #148 x2 tracker (+ Water Spout tier re-proof; Opus) and prep17 (Meteor Mash timing,
  Mud-Slap/Sand-Attack) in flight; then Overheat/Silver Wind (brief ready), Rollout Curl/Endeavor.
- **Notes:** no DEFERRED entries. Oracle freshness FAIL at orient = known false positive (no
  oracle/ commits since the services started 2026-10-03).

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
