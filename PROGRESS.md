# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 69 — S7 data needs closed (parallel worktree lane, merged): battle-message TEMPLATE system extracted + pixel-cross-checked, DOUBLE_TEAM evasion stage RAM-pinned, held-item damage-path inventory exhaustive

- **State:** merge of `worker/wt-20260718-151756` (base `d1072d3`, merged
  onto #68's `a515081`): `npm test` **437/437** (429+8), `npm run build`
  green, anchor 1/1 post-merge.
- **Did (worktree lane, supervisor-verified in the worktree pre-merge):**
  (1) `extract-battle-messages.ts` → `battle-message-templates.json`
  (365/369 `gBattleStringsTable` entries as structured segments +
  `STRINGID_USEDMOVE` + 52 `B_TXT_*` placeholders + stat-name/
  MULTISTRING sub-tables) and `extract-species-names.ts` →
  `species-names.json` (412) — a real pre-existing gap. Pixel-cross-
  checked against `battle1-turn1.json` captures at ticks 1960/2270
  (supervisor re-inspected both PNGs): "Foe GROVYLE used / DOUBLE TEAM!"
  and "ONIX used / ROCK SLIDE!" — including the "Foe " prefix the
  dossier's prose had dropped (corrected in place). +5 template tests.
  (2) `gBattleMons[1].statStages[EVASION]` flips 6→7 at tick 1959, holds
  to trace end, nothing else moves (probe spec committed, twice-run
  byte-identical) — closes dossier §8 risk 5. (3) BRIGHT_POWDER/
  LAX_INCENSE (`HOLD_EFFECT_EVASION_UP`, params 10/5) and WHITE_HERB
  (`RESTORE_STATS`) each have exactly ONE engine call site, neither in
  `CalculateBaseDamage` — EVASION_UP is accuracy-only (live for
  ROCK_SLIDE's roll vs Grovyle), line-cited in the dossier; full 70-item
  `item-hold-effects.json` extracted + pinned (+3 tests).
- **Next:** S7 stays behind S6. Remaining dossier needs: move-animation
  assets (§7 item 5), turn-end RNG cluster attribution,
  `gBattleControllerExecFlags` decoding.
- **Notes:** worktree removed, branch deleted after merge. No PAPERCUT.

---

## 68 — S6 scene-assembly GAP A FULLY RESOLVED: blend precision runs in 8-bit space not 5-bit (mathematically proven, not curve-fit), plus evaEvb's own one-tick render lag — `scene-assembly.json` 255/256 (was 151/256), whole 1075-1226 window byte-exact, 0 regressions

- **State:** `npm test` **429/429** (428→429, +1 pin, 2 corrected), `npm
  run build` green. `npm run compare -- tools/compare/traces/
  scene-assembly.json` → **255/256** (was 151/256). Full 18-trace sweep
  re-run, all others at their exact prior counts (anchor 1/1,
  draft-cursor 13/13, draft-menu 38/38, draft-menu-slot6 66/66, example
  4/4, summary-info-onix 122/122, summary-info-magby 132/132,
  confirm-decline 67/67, accept-prebattle 137/137, walk-warpout 125/125,
  room-entry 110/110, room-npcs 98/98, room-msgbox 142/142, transition
  206/206, rent-slot1 125/139, rent-3picks 157/190, confirm-flow 79/95) —
  zero regressions. Bonus: groundtruth trace `battle1-intro.json` also
  improved 141→167/254 (same fix, different trace, not required).
- **Did — the brief's mandated VRAM probe, then the real fix:** ran
  `tools/probe/ram-probe.py` on BG1CNT (`0x0400000A`), BLDCNT/BLDALPHA
  (`0x04000050`/`0x04000052`), the literal tilemap entry at
  `BG_SCREEN_ADDR(28)` for GAP A's named pixel (tick 1150, x=120/y=84,
  tileRow 10/tileCol 28), that tile's char (`BG_CHAR_ADDR(1)`) and
  palette-RAM bytes — every axis the brief flagged unverified came back
  **clean**: BG1CNT decodes to `screenSize=2` (256px-wide) exactly as
  `gBattleBgTemplates[1]` and this module already assumed (no bug); the
  tile entry (`tileId=8/hFlip=0/vFlip=0`) and its char data match the
  extracted JSON exactly; the entry's raw palette nibble is hardware
  bank 4 (JSON stores it locally as bank 2) but both read the identical
  RGB(222,231,247) — `extract-battle-bg.ts` renumbers only the banks a
  tileset references, a labeling convention, not a data bug. So the
  residual wasn't geometry/extraction. Root cause, found by hand-solving
  the blend equation: oracle's own pixel value there, (242,246,252), is
  **mathematically unreachable** by blending any two GBA palette colors
  in 5-bit space under any `eva`/`evb` — `(c5<<3)|(c5>>2)` only ever
  yields one of 32 fixed values per channel, and none of the three
  oracle values are among them (this holds regardless of which tile is
  blended, since every palette color is itself one of those 32 values —
  a freestanding proof, not a brute-force sample). The same operands run
  through `floor((tgt1_8bit*eva+tgt2_8bit*evb)/16)` **directly on the
  8-bit-expanded colors** (no 5-bit requantize) hit the oracle's value
  exactly on all three channels — apparently mGBA's own blend
  implementation runs in its native 8bpp domain rather than re-deriving
  5-bit hardware precision, and the oracle (not idealized hardware) is
  ground truth. `blendChannel` is local to `battleScene.ts` (only
  caller: `drawSlideScene`), so this only affects this window —
  `paletteFade.ts`'s own blend, used elsewhere, is untouched and still
  5-bit (already oracle-validated there). Fixing the domain took
  151→247/256, leaving exactly 8 mismatches at trace ticks
  1139/1145/1151/.../1181 — precisely the 6-tick BLDALPHA step
  boundaries. `evaEvb` was the one register in this task's model still
  missing the one-tick render lag every other register here already has
  (`bg1X`, the window edges, the scanline shift) — adding `et = t - 1`
  fixed all 8, landing on 255/256. The one remaining mismatch (tick
  1229) is GAP B's own separate, pre-existing, narrower residual (module
  doc point 3, untouched — out of GAP A's scope). Added 1 new Tier-1 pin
  at the exact previously-impossible pixel and corrected 2 stale evaEvb
  schedule pins to their render-lagged boundary ticks.
- **Next:** GAP A is closed — no further action needed on the streak
  window. Remaining scene-assembly work is GAP B's own point-3 residual
  (tick 1229, player bar 22px off — next probe on record: what
  structurally differs between the player widget's creation tick 1228
  and the opponent's 1231, both via `CreatePartyStatusSummarySprites`).
  Not attempted this session (optional stretch, time went to fully
  closing GAP A instead) — carries forward unchanged. After that:
  send-out engine slice
  1300-1560 (`battle-scene-notes.md` §7) and player send-out + menu
  1560-1810 (`battle-menu-notes.md`) — groundwork complete, assets
  ready, per #65's plan.
- **Notes:** PAPERCUT: none new. `bin/oracle run`/`ram-probe.py` scratch
  output went to `/tmp/probe-gapA-*` (not committed, no stale-cache
  risk). Both `docs/battle-scene-notes.md` and `battleScene.ts`'s module
  doc point 2 updated with the full derivation.

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
