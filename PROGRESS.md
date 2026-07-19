# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 126 — Supervisor: turn-2 scout merged — DRAGON_BREATH validates damageCalc's special branch **bit-exact**; ENDEAVOR discovered as Grovyle's AI move (HP-diff mechanic documented) — battle-1 move coverage 3→5 of 8; suite **634/634**

- **State (verified post-merge):** `npm test` **634/634**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-cloneanim re-verified
  168/230 (slice-B target, #125).
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-turn2.json` (3846 frames, 221 captures, twice-run 0 mismatch) +
  `battle1-turn2-ram-dump.json` (953 rows, 4 probes re-run byte-identical)
  + `battle-turn-notes.md` §12: all 14 turn-2 Random() steps LCG-attributed
  (1 single-step at tick 3121 honestly open); DRAGON_BREATH (first special-
  split move probed) reproduced bit-exact by the +2-corrected formula
  (15 pre-spread → 13 final); ENDEAVOR's `setdamagetohealthdifference`
  path documented (typecalc scales then copyword restores — type only
  gates immunity); paralysis didn't proc this seed; falsifiable turn-3
  prediction recorded.
- **Next:** round 7 — main lane: slice-B completion (extract
  `gStatAnim_*` via a new LZ77-BG extractor, OBJ-window-clipped BG1-scroll
  compositor, + the 4 near-1px clone ticks → 230/230); worktree:
  faint-to-victory ground-truth scout (extend the script through
  Grovyle's KO + Murkrow send-out — S7 tail + S8 prep). Then slice C/D.

