# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 130 — Supervisor: victory scout merged — battle 1's win line is LONGER than one oracle trace: ROCK_SLIDE PP exhausts (silent no-op at 0 PP), Onix faints turn 14 → forced player switch (party ONIX/MAGBY/BAYLEEF revealed); trace ends at 19634 frames vs the 20000 oracle cap — suite **638/638**

- **State (verified post-merge):** `npm test` **638/638**, `npm run build`
  green, tree clean, no worktrees/branches. turn1-rockslide re-verified
  181/256 (slice-C target, #129); turn1-cloneanim 230/230.
- **Did (worktree scout, verified then merged, conflict-free):**
  `battle1-victory.json` (19634 frames, twice-run 0/256 mismatch) +
  3.7MB RAM dump + `battle-turn-notes.md` §14. Headlines: **PP exhaustion
  is real and silent** (0-PP selection does nothing — no RNG, no text; a
  fixed-script harness deadlocks); DRAGON_BREATH fallback adapted; turn-13
  genuine miss; **Onix faints turn 14** (priority QUICK_ATTACK) and the
  battle does NOT end — forced party-select (SEND OUT/SUMMARY/CANCEL)
  with reserves MAGBY/BAYLEEF at full HP; trace ends there, one confirm
  press from continuing vs Pidgeotto at 1/143 HP. Open: the SEND OUT
  confirm button sequence (several attempts didn't commit the switch);
  **the full win may not fit the oracle's 20000-frame cap** from anchor —
  needs either a tighter script or a harness-level cap decision.
- **Next:** round 9 (final this session) — main lane: slice-C completion
  (rock slot-allocation simulation → 256/256 + the deferred Tier-1 pins);
  worktree: crack the SEND OUT confirm + frame-budget analysis (can an
  efficient line win under 20000 frames? — if provably not, that is an
  escalation-worthy harness finding for next session). Then slice D
  (drain/turn-end + ISSUES #16 validation) next session.

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

