# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 236 — Supervisor merge fold ×2: (1) turn-9 gap-probe SALVAGE (`wt-120256`, cap-killed mid-writeup, supervisor verified+committed its work): §41's "new hit-flash mechanism" DISSOLVED — it's the flicker task's FOURTH 4-tick block (`DoHitAnimBlinkSpriteEffect` runs 32 ticks = 4 blocks; the earlier probe stopped sampling at RAM 10977; the "position-dependent recolor" was background showing through the erasure) — `verify-turn9-postlunge.ts` now **108/108**; hitsplat stale-coefficient hypothesis REFUTED decisively (best brute-force (eva,evb) fit 62.2%; RAM-true 12/8 scores WORSE than current 16/16; floor-vs-round also refuted; RAM attrs banked: objMode=1, BLDCNT=0x3f40, BLDALPHA=0x080c; next instrument named: gPlttBufferFaded tint dump). (2) turn-11 probe (`wt-123722`): BOTH halves pure parameterizations — ROCK_SLIDE pressTick=13137 (full draw-order sequence verified vs real sSpriteOrder, 0/117 + 0/980 mismatches), FEATHER_DANCE pressTick=13339 with **0 feather-template OAM hits — direct RAM proof the blocked stat change short-circuits before createsprite**, so no feather table needed; ONE new branch (ATK-floor "won't go lower!" message, +83 delay, real apostrophe U+2019); `verify-turn11.ts` **52/52**

- **State (supervisor-verified post-merges):** `npm test` **946/946**,
  `npm run build` green, verify scripts fresh: turn9-postlunge 108/108,
  turn11 52/52 (plus turn10-rockslide 44/44, turn10-aerialace 20/20
  earlier this hour). Turn-12 probe in flight on `wt-20260721-123745`-
  family branch. Turn-9's capture gap (10945-10986) is now closeable:
  the 4th-block fix is a table extension; only hitsplat-live renders
  10935-10944 stay blocked (palette-tint instrument named).
- **Notes:** salvage protocol: verified the killed worker's uncommitted
  verify-script/diagnostics by rerunning them myself, wrote the dossier
  append from its in-code comments + script outputs, committed on its
  branch with provenance noted. Both diagnostics' NEGATIVES (coefficient
  + rounding) are the load-bearing finding — do NOT re-brief a blend-fit.

---
## 235 — Bounded worker (S7 slice R rung (a)): turn 10's ROCK_SLIDE half LANDS 0-diff end-to-end (kickoff through the turn-11 menu boundary) — `TURN10_ROCKSLIDE_PRESS_TICK=12169` wired through the existing turns-6/7/9-style dispatcher parameterization, plus Onix's own AERIAL_ACE-drain aftermath (HP drain 24→14 + "not very effective" text, both fresh-oracle-bisected); new `turn10-rockslide.json` **220/220, 0 diff**; rungs (b)/(c)/(d) NOT attempted this session (time-boxed), gaps unchanged from §42

- **State:** `npm test` **946/946** (936 + 10 new), `npm run build`
  green, both mandatory verify scripts (`verify-turn10-rockslide.ts`,
  `verify-turn10-aerialace.ts`) still fully passing, unchanged. Full
  regression sweep 0 diff: `turn10-menu.json` **83/83**,
  `turn10-aerialace.json` **18/18**, `turn9-quickattack.json`
  **117/117**, `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json`
  **130/130**, `turn1-rockslide.json` **256/256**.
- **Did:** `drawTurn10RockSlideAttack`/`Window`/`TurnEndSettledMenu`
  mirror `drawTurn9RockSlideAttack`/`Window` exactly, reusing every
  `rockSlide*` mechanism function unchanged with turn 10's own synthetic
  pressTick + Pidgeotto's 61→38 drain. `drawTurn10AerialAceWindow` now
  threads Onix's live draining HP (`turn10AerialAceOnixHp`, 24→14)
  through a new `onixHp` param on `drawTurn10FieldBase` (defaulted,
  every pre-existing caller unaffected), swaps to "It's not very
  effective..." once the drain settles, then hands off to the ROCK_SLIDE
  window at its own kickoff text start. Three new turn-end delay
  constants (super-effective text, text-clear, menu-redraw) each
  fresh-bisected via a scratch `drawText`+charmap probe against a live
  oracle capture, not assumed transferable from prior turns' own values.
- **Next:** rungs (b)/(c)/(d) — see §42's own handoff, unchanged: (1)
  mechanism 3's residual (renders 12363-12366, bisect the LUNGE table's
  early entries), (2) mechanism 4 (re-derive the live BG palette BANK
  NUMBER via direct RAM read, `dump-aerialace-anim.py` precedent, before
  retrying the darken render), (3) once both close, extend
  `turn10-aerialace.json` past 12362 through the dossier's own 12389
  settle boundary. No `src/` code for mechanisms 3/4 touched this
  session (nothing to revert).
- **Notes:** `docs/battle-turn-notes.md` §43 has the full writeup. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

---
## 234 — Supervisor merge fold: turn 10's ROCK_SLIDE half is a PROVEN pure parameterization (`worker/wt-20260721-114115` merged) — synthetic `pressTick=12169` satisfies EVERY shipped rockSlide* delay constant from turns 3/5/6/7/9 and reproduces turn 10's RAM through the real unmodified `rockSlideRockState`/`rockSlideDrawOrder` with 0 mismatches (261+125 sampled ticks); both HP drains re-pinned (Onix 24→14, Pidgeotto 61→38); dossier CORRECTED (turn-11 menu boundary has the standard idle-bounce, NOT flat); `tools/probe/verify-turn10-rockslide.ts` **44/44 supervisor-rerun** post-merge

- **State (supervisor-verified post-merge):** `npm test` **936/936**,
  `npm run build` green, verify script 44/44 fresh (145 ticks), worktree
  cleaned up. One honest unresolved probe gap: a RAM "target invisible"
  signal spans the rock-fall window with NO pixel effect (same family as
  §37's invisible-bit rule — flagged so nobody models a phantom hide).
- **Notes:** with #233's AERIAL_ACE state, turn 10's remaining work =
  (a) mechanical ROCK_SLIDE wiring, (b) mechanism-4 palette-pulse render
  retry (§42 handoff, pure table already Tier-1-pinned), (c) extend
  aerialace coverage past 12362. Turn-9 gap probe (hitsplat tip +
  hit-flash) in flight on `worker/wt-20260721-120256`.
