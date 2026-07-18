# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 67 — S7 groundwork banked (parallel worktree lane, merged): committed dense turn-1 trace + RAM dump + damage/type data extraction + `docs/battle-turn-notes.md` dossier — S7 engine slices now have fixed targets

- **State:** merge of `worker/wt-20260718-143156` (base `3ac0303`, merged
  onto #66's `19f12bb`): `npm test` **428/428**, `npm run build` green,
  post-merge spot-checks anchor 1/1 + summary-info-onix 122/122 (the
  regenerated `moves.json` with its new fields disturbs nothing).
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `tools/compare/traces-groundtruth/battle1-turn1.json` — 2620 frames,
  223 dense captures, extends `battle1-intro.json`'s exact button script
  with FIGHT→ROCK_SLIDE; twice-run 0 sha mismatches, and the supervisor's
  own independent replay reconfirmed the dossier's cited shas
  (`d223d98a2da9`@1884, `64857bf16c67`@2323, `70f4821905ff`@2345).
  (2) `src/data/gen/battle1-turn1-ram-dump.json` — 741 per-tick rows
  (gRngValue/HP/bar internals/turn order/damage) + two committed probe
  scripts, re-run and byte-diffed 0 vs the committed dump. (3) Data:
  `extract-moves.ts` now pulls effect/secondaryChance/target/priority/
  flags; new `extract-battle-formula-data.ts` → `type-effectiveness.json`
  (111 matchups) + `damage-formula-constants.json`. (4) `docs/
  battle-turn-notes.md` — frame boundaries with shas, 12-step RNG ledger
  (turn total: 0 for the AI's DOUBLE_TEAM + 4 for ROCK_SLIDE + 8-step
  unattributed turn-end cluster), damage math hand-verified to the dumped
  42 (supervisor re-derived it independently: base 30 → STAB 45 → spread
  [38,45]), HP-drain rule reconfirmed (1 HP/tick; hp updates 1 tick after
  the bar's done sentinel).
- **Next:** S7 remains behind S6 — this is groundwork only, no engine
  code. Open items carried in the dossier §7: the 8-9-step turn-end RNG
  cluster is still unmapped to a call site (AI-scoring hypothesis
  reinforced by a second independent stream, not proven);
  `gBattleControllerExecFlags` bit semantics undecoded; move-animation
  assets deliberately NOT extracted (listed as needs).
- **Notes:** worktree removed, branch `worker/wt-20260718-143156` deleted
  after merge. No PAPERCUT flagged.

---

## 66 — S6 scene-assembly GAP A (streak blend arithmetic) root-caused and substantially fixed: two real bugs the RAM/brief hadn't suspected (trainer OBJ layer omitted; BG3's real hardware width is 512px not 256), plus a genuine blend-precision fix — `scene-assembly.json` 151/256 (was 104/256), 0 regressions. One narrower residual named, next probe on record.

- **State:** `npm test` **428/428** (425→428, +3 pins), `npm run build`
  green. `npm run compare -- tools/compare/traces/scene-assembly.json` →
  **151/256** (was 104/256). Full 18-trace sweep re-run, all others at
  their exact prior counts (anchor 1/1, draft-cursor 13/13, draft-menu
  38/38, draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206, rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95) — zero regressions.
- **Did — the brief's mandated RAM probe, then two bugs it didn't predict:**
  ran `tools/probe/ram-probe.py` on the literal `BLDALPHA`/`BLDCNT` I/O
  registers (`0x04000052`/`0x04000050`) and `gBattle_BG1_Y` across ticks
  1130-1155 as instructed. Result: **the brief's own leading hypothesis was
  wrong** — `BLDALPHA` already reads `eva=6,evb=10` at trace tick 1150 with
  or without a one-tick lag correction (the plateau spans RAM ticks
  1146-1151 either way), and `gBattle_BG1_Y=0` was confirmed exactly as
  RAM always suggested. So the "numerically unreachable ~123 vs min-159"
  problem wasn't the blend ramp at all. Root-caused instead by RAM-probing
  `gSprites[gBattlerSpriteIds[0/1]]` (indices 3=player, 4=opponent) per
  tick: **both trainer OBJs are `invisible=0`/`inUse=1` from creation
  (tick 1074) onward**, sliding in via their own OAM `x2` at the exact same
  per-tick magnitude as `gTasks[0].data[2]` (the already-validated BG3
  scanline-shift value), opposite sign per side. #63's "neither trainer OBJ
  is ever visible during the reveal" was a real misdiagnosis — it only
  sampled each trainer's *settled* corner rect, never the sliding position.
  Wired `drawSlideScene` to draw both OBJs raw into the TGT2 buffer
  (in front of BG3, per their OAM priority) before BG1 blends on top;
  exact pixel match confirmed at the brief's own named pixel (tick 1150,
  x=11/y=40 → the opponent trainer's own raw skin-tone color, no blend
  needed there since BG1 is genuinely transparent at that mapY). Separately
  fixed `blendChannel` to run in 5-bit GBA color space with floor division
  (`paletteFade.ts`'s already-established convention for GBA blends, not
  round-in-8-bit) — off by 1 on roughly a third of blended pixels
  previously. **Biggest single contributor**, found while chasing a
  post-OBJ-fix residual (a phantom duplicate of BG3's sky-gradient tiles
  appearing 200+px away from their real position): `gBattleBgTemplates[3]
  .screenSize = 1` (`battle_bg.c:152-160`) means BG3 (`static`)'s real
  hardware width is **512px** (two side-by-side screen blocks), not 256 —
  `extract-battle-bg.ts`'s existing JSON already has block 2's data at
  tile-rows 32-63 (confirmed uniformly blank for every row this screen
  reaches), `staticBgPixel` just never read it, wrapping `mapX` back into
  block 1 at every 256px instead and re-showing its gradient tiles at the
  wrong column. Fixed the period/block-select math; net alone was 149→151
  (small locally, but it's what unblocked seeing the OBJ fix's true effect
  clearly — many frames' diffs shrank by thousands of px even where the
  match count didn't move). Added 3 Tier-1 pins in `tests/battleScene.test.ts`
  (oracle-verified pixel values) for all three fixes.
- **Still open, narrower than today's:** a pixel within `entrySlide` (BG1)'s
  own confirmed content zone (tick 1150, x=120/y=84) doesn't match the
  oracle under ANY combination brute-forced this session — every
  `bg1Shift`×`bg3Shift` pair (65536 combos) at the RAM-true `eva=6,evb=10`,
  and separately every `eva`×`evb` pair (17×17) with `bg1Shift` free, tops
  out at a handful of incidental matches. Ruled out a third sprite (RAM-
  probed all 65 `gSprites[]` slots' `inUse`/`invisible` at tick 1150 - only
  the two already-modeled trainers are active). Full account + the next
  probe (literal VRAM screen-block bytes at BG1's `BG_SCREEN_ADDR(28)`,
  cross-checked against this exact pixel) in `battleScene.ts`'s module doc
  point 2.
- **Next:** the point-2 VRAM probe above is the concrete next step for
  GAP A's remaining residual. GAP B's own narrow tick-1229 residual
  (point 3) is untouched, exactly as #64 left it — out of this step's
  scope.
- **Notes:** PAPERCUT: none new. This step's RAM probe disproved its own
  brief's leading hypothesis (BLDALPHA lag) within minutes — worth noting
  that the "probe first" discipline paid off by quickly ruling out a wrong
  turn rather than sinking time into it; the actual bugs were found by
  extending the same RAM-cross-check method (`gSprites[]`, `screenSize`)
  to structures the brief hadn't named. `bin/oracle run` scratch output
  went to `/tmp/scene-oracle` (not committed, not `tools/compare/out/` -
  no stale-cache risk left behind).

---

## 65 — Supervisor wind-down: session end 2026-07-18 ~14:30; S6 engine parity anchor→tick 1040 byte-exact, scene assembly 104/256 (one named gap), ALL S6 groundwork + RNG criterion banked

- **State (verified this minute):** `npm test` **425/425**, `npm run
  build` green, tree clean at `b4faa7a` + this docs commit. 18 committed
  parity traces: anchor 1/1, draft-cursor 13/13, draft-menu 38/38,
  draft-menu-slot6 66/66, example 4/4, summary-info-onix 122/122,
  summary-info-magby 132/132, confirm-decline 67/67, accept-prebattle
  137/137, walk-warpout 125/125, room-entry 110/110, room-npcs 98/98,
  room-msgbox 142/142, transition 206/206 — all byte-exact — plus
  scene-assembly **104/256** (sole in-progress slice, see #64/#63) and
  the three ISSUES-#5-policy traces (rent-slot1 125/139, rent-3picks
  157/190, confirm-flow 79/95). Engine covers the anchor through tick
  1040 of the 1886-tick battle-1 bring-up byte-exact; 1040-1295 partial.
- **Session summary (supervised, ~09:10-14:30, 20 worker steps, 2 lanes):**
  engine slices landed: walk+warp 400-519 (125/125), room entry 520-624
  (110/110), scientists+opponent 624-717 (98/98), speech msgbox 718-843
  (142/142), CIRCLES_MEET transition 843-1040 (206/206), scene assembly
  1040-1295 through 4 convergent iterations (42→104/256; systemic
  one-tick render lag discovered, #63); RNG criterion satisfied
  (`opponentGen.ts` bit-exact vs RAM dump, #61); ISSUES #15 root-caused
  + fixed (to5Bit palette-convention bug, #48). Parallel lane banked ALL
  remaining S6 groundwork: transition id RAM-confirmed (CIRCLES_MEET,
  #47), no-heal-icon correction + 843-1031 pinned (#53), scene-assembly
  mechanism (#55), send-out window (#59), menu window (#59), and every
  flagged asset extracted byte-exact (battle room #49, interface widgets
  #57, sendout anim assets #59). Suite 341→425 Tier-1 tests; traces
  13→19 (+4 dense groundtruth). Zero regressions at every one of 20
  verified steps; every worker ended at a green commit.
- **Next:** (1) scene-assembly GAP A residual — the streak window's
  blend arithmetic; exact next RAM probe in #63/`battleScene.ts` module
  doc; **user decision on record: keep iterating, no re-scope** (also in
  ROADMAP S6). (2) Then send-out engine slice 1300-1560
  (`battle-scene-notes.md` §7) and player send-out + menu 1560-1810
  (`battle-menu-notes.md`) — groundwork complete, assets ready. (3) The
  22px tick-1229 widget residual (#64) rides along with GAP A.
- **Notes:** PAPERCUTS.md gained the stale `tools/compare/out/` PNG
  entry (GAP-B worker's flag). No usage-limit events. Escalation
  mid-session (2 consecutive scene-assembly misses) was answered by the
  user in-terminal: keep iterating. One supervisor error caught+fixed:
  a double-rotated archive entry (#55, dedup commit `029c01f`).

---
