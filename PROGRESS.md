# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 129 — Bounded worker: **S7 slice C — ROCK_SLIDE window engine, LARGE MAJORITY LANDED, not yet 0-diff** — `turn1-rockslide.json` **0/256 → 181/256** (2963px total residual, avg ~40px/frame, max 172px, all in the 2362-2453 rock-overlap sub-range); suite **638/638**

- **State:** `npm test` **638/638**, `npm run build` green, tree clean.
  New committed trace `tools/compare/traces/turn1-rockslide.json` (256
  captures, 2193-2515) **181/256** — acceptance (0 diff) **not met**, but
  every mechanism except rock-vs-rock stacking order is independently
  pixel-exact (see below). Zero regressions: turn1-cloneanim 230/230,
  turn1-kickoff 81/81, fight-submenu 234/235, menu-idle 69/69, sendout
  255/256, s6-acceptance 224/228 — all re-verified unchanged.
- **Did:** implemented the whole window (`battleMenu.ts` pure fns +
  `battleScene.ts` render, docs/battle-menu-notes.md §11 has the full
  derivation) — the two text boxes (stat-rose + used-move), the
  `gBattle_BG3_Y` shake (a new background-only resampler,
  `drawStaticBgShiftedY`, since OBJs stay fixed on real hardware but this
  engine's usual `menuIdleBase` harvest bakes bg+OBJs into one flat image),
  all 20 falling rocks' spawn schedule + per-rock ellipse motion
  (call-timing model reverse-engineered tick-by-tick against fresh RAM
  probes — the naive "1 call/tick from spawn" reading was off by one call
  on the spawn tick specifically), the generic hit-flash, and — a genuine
  new finding, not predicted by the existing docs — Grovyle's own
  `AnimTask_ShakeMon` bounce, which §9.6 had predicted an engine could skip
  during the `monbg`-hidden window; a per-tick pixel brute-force proved
  otherwise (period-4 `[5,5,0,0]` render pattern, ticks 2362-2455). Also
  fixed a silent text bug (the stat-rose apostrophe needs the game's own
  U+2019 glyph, not ASCII `'` — the font has no glyph for the latter) and a
  background-wrap bug (BG3's real vertical period, 256px, wasn't being
  applied to the shake's negative `mapY`, blanking the top 7 screen rows).
- **Next:** round 9 — close the 75-frame gap: simulate the real `gSprites[]`
  slot allocation/reuse sequence for rock-vs-rock OAM stacking order (only
  13 distinct slots host all 20 rocks per the RAM dump; this session's
  fixed table-index draw order is a heuristic that gets ~71% of frames
  right, and the reverse order was tried and is worse, not better — the
  true rule needs actual slot simulation). Then add Tier-1 pins for the new
  pure functions (`rockSlideRockState`/`rockSlideBg3Y`/`rockSlideMonShakeY2`,
  time-boxed out this session). Then slice D (drain/turn-end) and the
  parallel victory-scout lane (#128's own next-action, unaffected by this
  session).
- **Notes:** docs/battle-menu-notes.md §11 has the full per-mechanism
  accounting + RAM-probe citations. PAPERCUT: none new — the RAM-probe
  scripts committed by the earlier ground-truth scout session
  (§9.5/`dump-registers.py`/`dump-rockslide-sprites.py`) were directly
  reusable against the already-committed dense traces, saved a lot of time
  versus re-deriving from source alone.

---
## 128 — Supervisor: Grovyle-faint ground truth merged (turns 3-5, KO + Pidgeotto switch-in) — suite **638/638**; round 8 = slice C (ROCK_SLIDE engine) + victory scout

- **State (verified post-merge):** `npm test` **638/638**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-cloneanim re-verified
  **230/230** on the merged tree (slice B complete).
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-grovyle-faint.json` (7312 frames, 256 captures, twice-run 0
  mismatch) + full RAM dump + `battle-turn-notes.md` §13 (turns 3-5
  ledgers, faint timeline, 7-item open list). Headlines: DESTIN switches
  in **PIDGEOTTO, not Murkrow** (party index 0→2 — a real AI decision,
  rule unresolved); **a KO's message is button-gated** (control run froze
  ~2996 ticks without an A press — every future script must press A at
  KOs); turn-4 falsified §12's AI-repeat prediction (DOUBLE_TEAM, not
  ENDEAVOR); Onix's Sitrus Berry auto-proc'd (player-side items
  previously unmodeled); +2 formula re-confirmed on RAM intermediates.
- **Next:** round 8 — main lane: slice C (ROCK_SLIDE window engine,
  2193→~2515: move text, monbg Grovyle-hide, BG3 shake, 20 rocks,
  hit-flash — all §9-pinned); worktree: victory scout (extend through
  Murkrow+Pidgeotto KOs to the battle-1 WIN and whatever follows — S8's
  swap-screen prep). Then slice D (drain/turn-end, closes #16's deferred
  validation) next session if time runs out.

---
## 127 — Bounded worker: **S7 slice B COMPLETE** — banner's real BG1 scroll extracted+composited, clone-edge residual root-caused to opponent-healthbox z-order — `turn1-cloneanim.json` **168/230 → 230/230**; suite 634 → **638/638**

- **State:** `npm test` **638/638** (+4 Tier-1 pins), `npm run build` green,
  tree clean. `tools/compare/traces/turn1-cloneanim.json` **230/230 - S7
  slice B ACCEPTANCE MET.** Zero regressions: turn1-kickoff 81/81,
  fight-submenu 234/235, menu-idle 69/69, sendout 255/256, s6-acceptance
  224/228, scene-assembly 256/256 - all re-verified unchanged.
- **Did (two separate green commits, per the brief):** (1) **Gap 1's 4
  sub-pixel clone-edge ticks (2075/2082/2088/2089) CLOSED** - re-verified
  the offset table bit-exact against a fresh RAM probe first (not a fit);
  root cause was DOUBLE_TEAM's clones reaching peak excursion (41-42px)
  right where their own chin/jaw tile overlaps the OPPONENT HEALTHBOX's
  right border, and this run's clone compositor painting over that
  higher-priority UI element instead of respecting its z-order.
  `isOpponentHealthboxOpaqueAt` (`battleScene.ts`) clips the clone draw.
  (2) **Gap 2 (banner) CLOSED** - new extractor `tools/extract/
  extract-stat-anim.ts` -> `stat-anim-banner.json` (reference/pokeemerald's
  `graphics/battle_anims/stat_change/` is all plain/uncompressed dev-time
  source, no LZ77 decoder needed - same situation `extract-battle-bg.ts`'s
  header already flagged; extracted the full 8-palette/2-tilemap family,
  wired only the evasion/increase pair DOUBLE_TEAM needs); rewrote
  `drawStatsBanner` to sample the real scrolling BG1 tilemap (same alpha-
  blend shape as the intro-slide's own `drawSlideScene`) instead of a flat
  white flash. The scroll anchor needed the SAME one-tick render lag `bg1X`
  already established for BG scroll registers (NOT `statsBannerEva`'s own
  no-lag convention - a different register class) - root-caused via a
  per-tick brute-force pixel sweep (`tools/compare/scratch/
  diagnose_banner.mjs`) after a naive same-tick mapping got the mechanism
  right but not bit-exact (halved the diff, didn't zero it).
- **Next:** round 8 — slice C (ROCK_SLIDE) or slice D (drain/turn-end,
  closes #16's deferred validation) — supervisor's call. The parallel
  ground-truth scout lane (turn-2, then faint-to-victory) continues
  independently.
- **Notes:** docs/battle-menu-notes.md §10 marked COMPLETE (§10c/§10d added).
  PAPERCUT: none - both residuals were exactly as scoped by #125: gap 1 was
  a real, small, root-causeable bug (not a fit), gap 2 was genuinely new
  extraction+compositing work, no rework of the already-CLOSED clone-motion
  formula needed.
