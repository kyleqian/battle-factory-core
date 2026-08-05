# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 948 — [interactive supervisor round 1, 2026-08-05] #73 WIN swap-YES bound **248/248**; battle-2 opponent provenance receipt banked; user play-test intake #76–#81 + scope decisions

- **State:** master `857dc84f` (swap-YES bind `5489a9f7` + side receipt merge),
  clean. New canonical trace `win-go-on-swap-offer-yes-off` **248/248** exact
  (frames 9930-10177; supervisor re-ran twice fresh post-salvage). Regressions
  re-held at the commit: WIN **3590/3590**, offer **115/115**, NO **213/213**
  (supervisor rerun), guide-dismiss **232/232**, LOSS **1943/1943**. Worker's
  full suite green pre-kill (**727 files / 6,979 passed / 1 skipped**);
  supervisor ran `npm run build` + smoke **347/347** after. The MAIN worker
  was cap-killed (exit 124) *after* its feature commit, during the final
  build — clean-tree salvage; this entry is the docs remainder.
- **Did:** (1) YES now enters the generic factory swap screen at the real
  schedule (A 10005-10006; settled input-ready player picker elapsed 99 =
  frame 10105). Two generic red-verified src fixes:
  `FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED` 59→63 (palette
  `softwareFadeFinishing` holds `active` 5 ticks past visual settle), and
  swap-picker category text derived from `draft-pool-header.json` (all 376
  species; was a six-species hand-cast that couldn't resolve the WIN route's
  DUSCLOPS party). Honest boundary: ball-rocking restart is per-ball
  `Random()%5` (ambient RNG, #55-adjacent), so the window ends at 10177,
  one frame before the first anim-end. (2) SIDE receipt
  (`docs/win-battle2-opponent-provenance-receipt.md`, supervisor re-ran the
  driver: ALL CHECKS PASSED): `GenerateOpponentMons` is **single-frame**
  (6636), pre-call cursor `0x7399E3AE` → 4 gapless draws → trainer **9
  LILIANA** + sets 169/170/130 byte-for-byte; party construction spans 32
  frames with ambient interleaving — per-mon cursors reproduce all three
  personalities exactly. §7 names the exact scaffold fields for the wiring
  step.
- **Next:** MAIN: #76 Confuse Ray crash (user play-test, top priority);
  SIDE: #77 message-hold timing scout. Then: provenance wiring into
  `winTerminalWindowStage` per receipt §7; #78 switch-presentation scout;
  #79 Fly visibility probe; #80 party-menu inventory; #81 torment
  indication; RECORD/RETIRE/lobby/REST per the user decisions below.
- **Notes:** user play-tested the pinned preview (`.worktrees/play-preview`
  at `974ef563`, port 5199) and filed six reports → ISSUES #76-#81. User
  scope decisions (2026-08-05, recorded in ROADMAP S10 + ISSUES #73): full
  battle parity breadth (all legal Gen-3 species/moves/abilities/items in
  singles; barriers become implement-or-prove-unreachable), RECORD
  stub-only (session flag for the 4→3 menu variant), REST unselectable
  (deliberate divergence), RETIRE fully (reuses the loss-lobby flow — same
  ROM script), lobby walkable / no exit / no PC (real map has none) /
  silent NPCs, wandering optional.

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
