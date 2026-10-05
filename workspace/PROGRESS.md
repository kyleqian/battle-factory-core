# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-04 (evening) — S10A wind-down: 131 -> 144 live adapters

- **State:** S10A, local master; production `1a68bb532`; 144 live adapters,
  132 accepted bodies remain. Supervisor final gates on `1a68bb532`: 1,495
  files / 11,996 tests, build 847 (`final-supervisor-gates-20261004-evening.json`).
  Wound down early at the user's request. Opus 5.5 supervisor, Sonnet 5.5 workers.
- **Did (integration, 2 folds, no move dropped):** next5 — Scary Face,
  Glare, Teeter Dance, Dizzy Punch (presentation-only party personality on
  the field battler), Soft-Boiled (displayed bystander); prep2 — Surf, Muddy
  Water, Icy Wind, Blizzard, Fake Out (`liveBattlerCoordAttrs`), Cosmic Power,
  Future Sight (turn 1), Explosion. Each independently re-proved dense twice
  fresh (2,229 and 3,620 rows/run, zero residual, incl. four alternate-species
  cases) plus ordinary routes 4/4 and 7/7 with ON/OFF parity.
- **Did (side lane, evidence only):** prep2 triage of 33 H_BASIC/H_DERIVED
  moves; static H_BUFFER triage (84); measured prep with drafted fixtures and
  routes for 13 more moves (`docs/h-buffer-s1-prep.md`,
  `docs/next-adapters-prep5.md`). Ember, Heal Bell, Perish Song, Leaf Blade,
  Dragon Rage need the sprite-order provider.
- **Next:** dispatch the H_BUFFER S1/S2 batch (Mean Look, Smelling Salt,
  Defense Curl, Ingrain, Wrap, Bind, Dragon Breath) from
  `.codex-logs/s10a-hbuffer-s1-batch-20261004-brief.txt` (fill
  __BASE__/__COUNT__/__CAP__/__STOPADD__), then the six prep5 READY moves, then
  sprite-order provider slices. ROADMAP S10A "Next (2026-10-04 late)" lists all.
- **Notes:** limits recorded per receipt: Icy Wind/Blizzard show the
  scene-off view where the reducer's retained slot table cannot verify the
  geometry (Blizzard ~90% player-attacker / ~34% opponent-attacker pairs
  live); Soft-Boiled has no rental carrier (dense only); Scary Face/Dizzy
  Punch script tails uncovered. No DEFERRED entries. All worker branches
  merged/deleted; evidence copied to `.integration/validation/`.

---

## 2026-10-04 — S10A session wind-down: 79 -> 131 live adapters, #142 fixed

- **State:** S10A, local master `d935baca4`; 131 live adapters, 145 accepted
  bodies remain. Supervisor final gates on `d935baca4`: 1,493 files / 11,963
  tests, build 847 (`final-supervisor-gates-20261004.json`); preview
  <http://127.0.0.1:5191/> serves `d935baca4`, four exact canvas/PNG hashes,
  export, ON->OFF restart, no errors. Opus 5.5 supervisor, Sonnet 5.5 workers.
- **Did (integration lane, 12 folds, each independently re-proved twice fresh
  with zero residual + ordinary ON/OFF routes):** Light Screen guard repair;
  fieldfx 6, glow 5, anchor 7 (+ `liveBattlerAnchors`), wall family 5 (source
  allocator plans), anchor2 7, anchor3 8, selectors 4, multi-hit 3, anchor4 6 adapters;
  allocator history now persists across the 110 audited net-zero bodies;
  ISSUES #142 found, scoped and fixed (elevated-opponent shadow on the
  activation frame for 97 live ids; Sandstorm opponent idle).
- **Did (side lane, new-files-only evidence):** wall-family allocator
  receipts, net-zero audit (all live ids), consumer tie audit, sSpriteOrder
  evidence + exact free-slot event model and provider design, status-animation
  sprite audit, alternate-species proofs (source-derived windows), #142
  shadow-row table, multi-hit prep, Reversal shake evidence, visual-
  randomness prep (Random2-only inputs; personality moves exact now).
- **Next:** ROADMAP S10A resume points: sprite-order provider slices,
  status-animation occupancy persistence, Reversal reducer change (needs the
  animation program's acceptance), Dizzy Punch/Teeter Dance (personality),
  Soft-Boiled, Scary Face/Glare, then H_BUFFER/H_RANDOM/H_OUTCOME groups. Validate with alternate-species proofs.
- **Notes:** no material decision deferred; DEFERRED.md has no open entries.
  Oracle freshness FAIL at orient was a false positive (workspace-only
  commits). Papercuts added: replay forced-replacement, Supersonic probe
  wrapper, preview manifest wiped by builds. All worker refs merged/deleted;
  evidence copied to primary `.integration/validation/`.

---

## 2026-10-04 — Opus supervisor and Sonnet worker defaults

- **State:** default `./run-supervisor.sh` now uses Claude Opus 5.5
  (`claude-opus-5-5`) with Sonnet 5.5 (`claude-sonnet-5-5`) workers.
  S10A remains active; 79 adapters, 197 accepted moves remain.
- **Did:** changed the default provider/model, refreshed Opus/Sonnet aliases
  and direct-worker default, and aligned active run guides. Explicit Codex,
  mixed-provider and max-mode profiles remain available.
- **Checks:** shell syntax and both resolved configs pass; three affected
  launcher/boundary/inventory files, 71 tests pass; coverage/asset audit and
  diff checks pass. Launcher tooling only; accepted production unchanged.
- **Next:** review preserved Light Screen candidate `84f2e5264` in
  `.worktrees/integration-20261003-085057`; repair its allocator-history guard
  before independent proof and merge. Brief remains in
  `.codex-logs/s10a-lightscreen-guard-repair-20261003.txt`.
- **Notes:** latest IDs verified against Anthropic's model documentation;
  Claude Code 2.1.289 installed. This change starts no new work session.
  The prior supervisor stopped at a model-capacity error after withholding
  Light Screen; candidate worktree and logs are retained.
