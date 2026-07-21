# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 237 — Bounded worker (S7 slice R rung 0 + turn 11 rungs 1-3): turn 9's flicker gap CLOSED (20→32-tick table extension, `turn9-quickattack.json` 159/159) and turn 11's whole arc (menu reopen, FEATHER_DANCE-blocked half, ROCK_SLIDE half) LANDS 0-diff through the turn-12 menu boundary — new `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**, `turn11-rockslide.json` **163/163**; one genuine cross-regime idle-bounce bug found + fixed along the way

- **State:** `npm test` **957/957** (946 + 11 new), `npm run build`
  green, both mandatory verify scripts fresh: `verify-turn9-postlunge.ts`
  **108/108**, `verify-turn11.ts` **52/52**, both unchanged. Full
  regression sweep 0 diff, every count matches the acceptance criteria
  exactly: `turn9-quickattack.json` **159/159** (117 base + 42 new),
  `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**,
  `turn10-menu.json` **83/83**, `turn10-rockslide.json` **220/220**,
  `turn6-feathers.json` **235/235**.
- **Did:** (rung 0) bumped `TURN9_EP2_FLICKER_TOTAL_TICKS` 20→32 — the
  4th flicker block and the task's own force-visible tick both fall out
  of the existing `n % PERIOD < ON` gate with no special-casing, exactly
  as the dossier's own addendum predicted (no new mechanism). (rungs 1-3)
  added `turn10Resolved` as a new `BattleSceneState` field threaded
  through the FULL existing reopen-gate chain in `core.ts` (mirroring
  every prior `turnNResolved` flag verbatim) + `drawFightSubmenuWindow`'s
  dispatch chain + `currentPPForActiveMon`'s PP-decrement chain (ROCK_SLIDE
  now an 8th slot-0 use, 2/10 entering turn 11); `drawTurn11FeatherDanceWindow`
  reuses turns 6/7/8's own kickoff-text functions unchanged, omits the
  feather-sprite draw calls entirely (RAM-confirmed they never fire), then
  dispatches the new ATK-floor message; `drawTurn11RockSlideAttack`/`Window`/
  `TurnEndSettledMenu` mirror turns 6/7/9/10's own instances with only the
  press tick + Pidgeotto's HP (38→16) new. One real bug found via
  `npm run compare` itself (not guessed): turn 11's own FIGHT-submenu
  browsing phase needs its OWN regime-shift constant
  (`TURN11_REGIME6_TO_REGIME1_SHIFT` + `drawTurn11FieldBase`), not turn
  10's — `menuIdleBounce`'s underlying task genuinely restarts at every
  turn's own menu redraw. Also caught+fixed a 1-tick error in the dossier's
  own "13858" text-clear citation (real hardware holds through 13858,
  clears at 13859).
- **Next:** turn 12 (a sibling probe owns `turn12-notes.md` this round,
  out of scope here) — `battle-turn-notes.md` §15's own predicted
  ROCK_SLIDE miss (PP 1/10→0/10) is the natural next full-turn scout.
  Standing named gaps unchanged: the hitsplat tip/edge residual (10935-10944,
  next instrument: `gPlttBufferFaded` tint dump — do NOT re-attempt a
  blend-coefficient fit, decisively refuted); AERIAL_ACE mechanisms 3/4
  (§42/§43's gaps, untouched this session, out of scope).
- **Notes:** `docs/battle-turn-notes.md` §44 has the full writeup. No
  PAPERCUTS beyond the standing mgba-venv-teardown one.

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
