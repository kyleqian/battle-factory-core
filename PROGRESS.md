# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 7 — ISSUES #3 partial: slot6 every-frame trace 40/66 → 58/66

- **State:** `npm test` **110/110**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` 38/38 —
  still all 0 diff (no regressions). `draft-menu-slot6.json` (every-frame
  0-65) **58/66** (was 40/66). S2 stays `[~]` — 8 frames still differ, all
  redraw-scheduling transients (see `ISSUES.md` #3, trimmed to just these).
- **Did:** Root-caused and fixed the two clusters inside the mon-pic
  sub-state machine (`src/engine/monPic.ts`): (1) the ball-open flash bar's
  flat-vs-blended color was wrongly tied to the hasActed timing variant —
  it actually tracks a separate, session-persistent "has BLDCNT ever been
  configured" flag, now `MonPicState.blended`; (2) that same
  first-ever-open-after-a-cursor-move case needs its own window-growth
  timing table ("variant C"), pinned from dense oracle probing of
  draft-menu-slot6.json. Added 4 new hermetic Tier-1 tests (15→19) pinning
  variant C and the blend/variant decoupling.
- **Next:** Fix the remaining 3 clusters (all `Select_Task_Handle*`'s
  redraw scheduling, not mon-pic): f1-f3 cursor-move header/arrow redraw,
  f37-f38 menu-highlight redraw (likely same mechanism as f1-f3), f44/47-48
  close-phase transients. `ISSUES.md` #3 has a dedicated probing plan for
  each (isolate with single-purpose dense traces before fixing against the
  combined slot6 trace). Then tick S2 `[x]`, then S4.
- **Notes:** The end-states are already exact — only 8/66 frames differ,
  all transient (settle within 2-4 ticks); this is scheduling/timing, not
  missing mechanisms.

---

## 6 — Ball-open reveal landed (38/38); every-frame capture exposes transients

- **State:** `npm test` **106/106**, `npm run build` green. Compares:
  `anchor.json` 1/1, `draft-cursor.json` 13/13, `draft-menu.json` **38/38**
  — all 0 diff. NEW `draft-menu-slot6.json` (every-frame captures 0-65)
  → **40/66**: the ≤4-frame-spaced traces skip transient frames that are
  not yet exact. S2 stays `[~]`; remainder is `ISSUES.md` #3 (clusters +
  diff forensics there). ISSUES #2 deleted (fixed: reveal + blend + 6 front
  sprites, monPic sub-state Tier-1-pinned).
- **Did:** Worker landed the mon-pic reveal (WIN0 growth, 5-bit-space
  blend, front-sprite extraction for all 6 species) + 15 hermetic tests;
  hit its 50-min cap while building the slot-6 trace. Supervisor verified
  all compares/tests, ran the unfinished trace, inspected diff PNGs,
  filed #3 with per-cluster diagnosis, committed the trace.
- **Next:** Fix `ISSUES.md` #3 → `draft-menu-slot6.json` 66/66, then tick
  S2 `[x]`. Then S4 (summary screen).
- **Notes:** Transient mechanisms are all in battle_factory_screen.c
  (affine open anim, redraw scheduling, close-phase sprite visibility).

---

## 5 — Supervisor: S3 merged from worktree lane — S3 COMPLETE

- **State:** Merged `worker/wt-20260717-012856` (S3: RNG core, rental data,
  anchor RAM dump) into master; on the merged tree `npm test` **91/91**
  green, `npm run build` green, `anchor.json` 1/1 and `draft-cursor.json`
  13/13 still 0 diff. Worktree + branch cleaned up. S3 ticked `[x]` in
  ROADMAP; S2 remains `[~]` with `ISSUES.md` #2 (ball-open reveal) open.
- **Did:** Verified S3 in the worktree (74/74 there; LCG constants checked
  against `random.c`; dump spot-checked: `gRngValue 0xd2ddeec8`, six
  species in pinned order with RAM-read Lv50 stats). Added the
  `sFactorySelectScreen` finding to ROADMAP Domain notes.
- **Next:** Finish S2 via `ISSUES.md` #2 (mon-pic window growth + GBA
  5-bit-space alpha blend + 6 front-sprite extraction), then S4.
- **Notes:** Statics aren't in the linker map — `nm` on the pinned ELF
  resolves them (recipe in `tools/extract/inspect-anchor.py`).

---
