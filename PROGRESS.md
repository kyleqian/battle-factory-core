# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 947 — [interactive supervisor, 2026-08-05] Launcher: DeepSeek deadline-in-prompt + generalized commit attribution

- **State:** master `35d1f90e`, clean; tooling-only (no engine or fixture
  change). `tools/test-codex-git-attribution.sh` **4/4**;
  `codexLauncherProfiles` + `vitestWorkerBudget` **38/38**. Claude/Codex
  worker briefs stay byte-identical (deadline clause is DeepSeek-only by
  design).
- **Did:** (1) DeepSeek worker/audit briefs now state their absolute deadline
  (local time + epoch derived from --cap-minutes) and instruct `date +%s`
  checks with a 10-minute wind-down — both observed cap-kills (exit 124) had
  every edit complete but uncommitted. (2) Root-caused untrailed DeepSeek
  commits: the 2026-08-04/05 trailer census read all supervisor commits
  `[Codex]` vs all worker commits `[NONE]`; `run-subagent.sh` strips the
  inherited Codex attribution env for every non-Codex provider and the
  OpenCode route never re-enabled it. Env passthrough itself was verified by
  a live OpenCode probe (GIT_CONFIG_* and POKEBENCH_* survive to tool
  shells), the deadline wrapper is transparent, and workers committed with
  plain `git commit` — so re-enabling at launch is sufficient. DeepSeek
  worker commits now stamp `Generated-by: OpenCode` +
  `Agent-model: deepseek/deepseek-v4-flash` (Agent-effort omitted — that
  route has no knob). Generic attribution files mirrored to
  `_template/tools/` (template test 4/4).
- **Next:** unchanged from 946 (terminal ambient-RNG/opponent provenance,
  WIN YES swap branch, RECORD/REST/RETIRE). `_template` still lacks the
  whole DeepSeek/OpenCode worker route (zero deepseek references there; the
  new launcher branches have nothing to attach to) — tallied in PAPERCUTS.md
  as deliberate follow-up debt, not silently absorbed.
- **Notes:** attribution stays trailer-based (author/committer unchanged) per
  the Codex precedent; `codex_git_attribution_enable` is retained as a
  Codex-identity wrapper so existing call sites are untouched.

---

## 946 — [supervisor fold, 2026-08-05] #73 WIN room handoff exact **232/232**; next-opponent generation moved to the source boundary

- **State:** union through `7708808c`; guide dismissal, attendant/player walk, warp
  fade, room fade-in, and battle-2 room handoff are exact at **232/232**
  (frames 10406-10637). Regression gates re-held: NO/guide **213/213**,
  canonical WIN **3590/3590**, LOSS **1943/1943**, LOSS decline **155/155**,
  and generated command **128/128**. Final union `npm test` is green at
  **727 files / 6,977 passed / 1 skipped**; `npm run build`, smoke **347/347**,
  typecheck, and `bin/oracle info` are green. `animation-main` has no commit
  missing from master at wind-down, so no second fold was required.
- **Did:** banked a 39-segment fixture that preserves the prior 37 segments
  byte-for-byte, presses the held `Right this way, please!` once, and idles
  through the Battle Room's stable quote. Existing generic postwin and room
  machinery reproduced every timing boundary through the first opponent-art
  pixel with no calibration or battle-number branch. A RAM probe identifies
  the ROM's next trainer as LILIANA (id 9). The app's synthetic terminal stage
  instead generates ABBIE (id 73), so divergence begins at 10638 solely in
  next-opponent sprite/quote content. Audited and narrowed the terminal-party
  overlay wording: Sketch is the general move-write exception, but no legal
  Factory set carries it; Transform/Mimic do not persist to party identity.
  Corrected the generic controller's ownership seam to match source
  `AskSwapMon`: accepting GO ON now pre-generates battleIndex+1 before the
  type/style commentary and swap offer, records the uninterrupted facility-RNG
  segment immediately, retains the defeated party for the optional swap, and
  publishes the already-generated opponent only after swap resolution. Four
  Tier-1 cases pin the timing, idempotence, decline/accept publication, and
  live `core.tick` routing; focused **56/56**, typecheck, and smoke are green.
- **Next:** align the terminal comparison stage's ambient-RNG/opponent
  provenance with the ROM without trainer-specific staging, then bind the
  held battle-2 quote dismissal/setup. Separately exercise the WIN YES swap
  branch and RECORD/REST/RETIRE choices; do not resume the retired canonical
  Battle-2 turn march.
- **Notes:** the source-order generation owner is now explicit and the generic
  round advances to battleIndex 1 only when the swap result publishes it.
  The far-side content gap remains an exposure of #55's ambient RNG/provenance
  model, not a presentation-timing failure. Evidence:
  `docs/post-terminal-beyond-boundary-win-go-on-guide-dismiss-evidence.md`.

---

## 945 — [bounded MAIN worker, 2026-08-05] #73 WIN swap-offer NO decision bound: `win-go-on-swap-offer-no-off` exact **213/213** twice fresh

- **State:** master `89693d9d`, clean. The swap-offer NO decision + the generic
  `Right this way, please!` guide are bound at **213/213** exact twice fresh
  (frames 9930-10406, dense; PNG-byte-identical both runs). Regressions
  re-held: canonical WIN **3590/3590**, LOSS **1943/1943**, LOSS decline
  **155/155**, win-beyond **228/228**, GO ON scout **143/143**, type **93/93**,
  style **92/92**, swap-offer **115/115**, battle-command-generated **128/128**.
  Full `npm test` **727 files / 6,973 passed / 1 skipped** and `npm run build`
  green; smoke 347/347.
- **Did:** authored `scratch-win-go-on-swap-offer-no-probe.json`, preserving the
  swap-offer fixture's 33 segments byte-for-byte and appending a safely-held
  DOWN (9943-9944, cursor display -> NO at 9944), a bounded idle, an A
  accepting NO at 10005-10006, and a bounded idle tail (37 segments / 10406
  frames). Dense oracle captures bind the NO decision, YES/NO-window dismissal
  (edge+1), box clear (edge+3), and the generic `Right this way, please!`
  guide typing 1 glyph/tick from edge+4 to its final glyph at edge+26 (frame
  10031), held **with no wait-cursor** through the endpoint 10406 — the genuine
  held/dismiss-ready boundary, unpressed per contract (no walk/warp). One
  generic src fix was required and landed (`overlayTerminalKernelParty` now
  overlays only the four battle-mutable fields — HP/status1/item/PP — onto the
  rental identity instead of spreading the whole terminal party): the WIN
  scaffold's placeholder terminal party (DUSCLOPS, personality `0xff`, IV 3)
  was corrupting the kernel party so `healFactoryKernelParty`'s identity guard
  threw on the NO advance. Red-verified Tier-1 pin
  (`tests/factoryRoundBattleOrchestrator.test.ts`); no calibration — the
  existing `movePostwinSwapCursor`/`acceptPostwinSwapDecline`/
  `postwinRightThisWay*` machinery reproduced every boundary with its current
  constants. Evidence: `docs/post-terminal-beyond-boundary-win-go-on-swap-offer-no-decision-evidence.md`.
- **Next:** a separate YES decision should enter the already-generic swap UI
  (or hand its fixture to the swap-screen path); the unexercised
  RECORD/REST/RETIRE continuation choices remain. Promote the proven decision
  span into the canonical WIN window once the YES/guide tail is also bound.
- **Notes:** no absolute frame/battle-number/fixture branch; the overlay fix is
  source-relative (the real game only writes HP/status/item/PP back to
  `gPlayerParty` during a battle — identity is never battle-mutable). LOSS
  record playback/free-roam remain separate.

---
