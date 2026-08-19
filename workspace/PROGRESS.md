# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 1348 — [main worker, 2026-08-19 session 9] **ladder Slice 1 CLOSED: turns 9/11/12 idle-bounce residuals all full bars (finisher for 3 salvaged fixes, one docs+pins commit)**

- **State:** one green commit (`7a914770`, Tier-1 pins) plus this docs
  commit. `npm test` **1,067 files / 10,114 passed (+30 new pin
  assertions) / 223 skipped**; `npm run build`/`npm run typecheck` green.
  The three fixes themselves (`62a36f66`/`511c8c7f`/`eb0be62b`) were landed
  and supervisor-verified by a prior, cap-killed worker; this session was
  the finisher only (pins + docs + differential), no fix logic touched.
- **Did:** added 4 "ISSUES #39 rank-5 slice 1 (`<sha>`)" describe blocks to
  `tests/battleScene.test.ts`, pinning each fix's raw-sine-index offset
  directly against the fixed `menuIdleBounce` closed form at named ticks
  (turn9: +191 flat + +205-with-2-tick-freeze; turn11: +114; turn12:
  +237), each paired with a pre-fix (offset 0) mismatch proof. Exported 5
  previously-file-local symbols in `battleScene.ts` to make this possible
  (no logic change — `git diff` is 5 lines, each just adding `export`).
  Red-verified by zeroing the three named offset constants in source: 6 of
  the new pins failed as expected; restored (byte-identical to pre-edit)
  and reconfirmed green before committing.
- **Result:** `turn9-quickattack-off` **233/233**, `turn11-featherdance-off`
  **191/191**, `turn12-aerialace-off` **247/247** — all three CLOSED (full
  bars). Differential guard (`compare:differential -- turn10-aerialace-off
  turn10-rockslide-off turn10-menu-off turn9-rockslide-off
  turn11-rockslide-off turn12-rockslide-miss-off --base c4441e8e --summary`)
  **1312/1312 captures byte-identical**. Spot-guards `turn5-resolve-off-a`
  196/196, `turn5-confirm-off-a` 132/132 (both #97-family, unaffected).
  Docs: dated landed-addendum in `docs/idle-bounce-phase-attribution.md`;
  row 5 of `docs/battle-scene-retirement-inventory.md` updated to full
  bars; `docs/presentation-seam-retirement-ladder.md` Slice 1 marked
  LANDED with final counts.
- **Next:** ladder Slice 1 is fully closed. Ladder Slice 2 (the
  `battleScene.ts` -> `battleSceneCanonical.ts` split, ~35-45% executed,
  `docs/presentation-seam-retirement-ladder.md` §3) is the next open item
  on this doc's own ladder — not started this session, out of this step's
  scope. The idle-bounce doc's own §5 prediction
  (`TURN8_MENU_REDRAW_DELAY≈434`, the turns 6-8 upstream OFF re-timing
  that would let these three per-turn offsets be replaced by one shared
  upstream fix) remains open and unpursued — named for whoever retimes
  turns 6-8, not blocking anything today.
- **Notes:** no PAPERCUT.

---

## 1347 — [main worker, 2026-08-19 session 8] **ISSUES #97: `turn5-resolve-off-a` CLOSED 193/196 -> 196/196 — §20.1/§20.2's two decisively-pinned one-liners (two commits, all green)**

- **State:** two green commits (`58eafbd8` Fix 1, `adf15be1` Fix 2) plus
  this docs commit. `npm test` **1,067 files / 10,103 passed (+2 new pin
  blocks) / 223 skipped**; `npm run build`/`npm run typecheck` green.
- **Did (Fix 1, §20.1):** `rockSlideOpponentHp(t + 2, ...)` at
  `drawTurn5RockSlideAttack`'s own call site (`battleScene.ts:11008`) —
  the opponent-healthbox never-show-empty-bar sliver's hp=1->hp=0
  boundary landed 2 render ticks late (app 6285 vs real hardware's
  RAM-6282/pixel-6283). `resolve-off-a` 193/196 -> 195/196 (6283/6284
  close exactly, 6398 unaffected).
  **Did (Fix 2, §20.2):** `if (t - 1 >= cursorStart)` at
  `drawTurn5RockSlideWindow`'s fainted-message cursor first-appearance
  gate (`battleScene.ts:15089`) — the one dispatch point in that
  function missing the same `t - 1` display-basis correction every
  sibling gate already has, so a spurious cursor drew one tick early.
  `resolve-off-a` 195/196 -> **196/196 CLOSED**.
- **Result:** Full 16-trace guard family reran after EACH fix with
  **zero decreases**: `resolve-off-{a,b,c,d}` 196/196, 196/196, 195/196,
  194/196; `confirm-off-{a,b}` 132/132, 131/132; `reset-off` 256/256;
  `action-off` 32/32; `turn6-reopen-off` 46/46; `turn6-menu-off.json`
  47/47; `turn6-rockslide-{a,b}` 255/255, 105/105; `turn7-rockslide-a`
  256/256; `turn13-switchin` 242/242 (confirms `drawTurn5RockSlideAttack`'s
  other caller, turn 13's Murkrow reuse, unaffected); `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256 each.
- **Next:** `turn5-resolve-off-a`/`-b` are both now fully closed
  (196/196 each). Remaining #97 residuals are owned elsewhere:
  `resolve-off-c`'s own 6763, `resolve-off-d`'s own 6850/6996 — both
  side-lane-owned (`docs/turn5-single-frame-residuals-diagnosis.md`,
  currently being probed in parallel).
- **Notes:** no PAPERCUT. Both fixes red-verified against pre-fix code
  via `git stash -- src/engine/battleScene.ts` before finalizing (both
  new pin blocks fail at exactly the predicted pre-fix values). Landing
  addendum banked as §21 in `docs/turn5-resolve-ab-pools-diagnosis.md`.

---

## 1346 — [main worker, 2026-08-19 session 7] **ISSUES #97: `turn5-confirm-off-a` CLOSED 128/132 -> 132/132 — §9.5's one-liner + §9.6's derived live-bounce correction (two commits, all green)**

- **State:** two green commits (`54c87516` step 1, `0c5a1e6f` step 2)
  plus this docs commit. `npm test` **1,067 files / 10,099 passed (+4
  new pin blocks) / 223 skipped**; `npm run build`/`npm run typecheck`
  green.
- **Did (step 1, §9.5):** widened `drawFightSubmenuWindow`'s `textStart`
  ternary (`battleScene.ts:8592`) to also route `turn5Active` through
  `turn2KickoffTextStartTick`'s already-landed `-1` correction — turn 5
  had simply never been added to that side of the ternary. `confirm-off-a`
  128/132 -> 129/132 (tick 5968 closes exactly, as predicted).
  **Did (step 2, §9.6's own named probe):** extended
  `dump-turn5-confirma-bounce-driver.py` with a full 1-5970 RAM scan for
  driver-id changes. Decisive finding: exactly ONE creation event in the
  whole window — turn 1's own `MENU_BOUNCE_RAM_SETUP_TICK` (1748); the
  confirm-wait bounce driver is the SAME instance the entire game, not a
  turn-5-specific reseed as §9.6 hypothesized. With no fresh anchor
  available, derived the correction directly from matching the live
  branch against the real driver's own already-probed raw `sSinIndex`
  values (§9.2): exact match gives `bounceTick=2098` for screen tick
  5959 vs. the current formula's `2119` — a constant **-21**, scoped to
  the live pre-freeze sub-window only. `confirm-off-a` 129/132 ->
  **132/132 CLOSED**.
- **Result:** Full guard family reran after EACH step with **zero
  decreases**: `-b` 131/132, `resolve-off-a` 193/196 (out-of-scope guard
  bar, side lane's own 6283/6284/6398 untouched), `-b` 196/196, `-c`
  195/196, `-d` 194/196, `reset-off` 256/256, `action-off` 32/32,
  `turn6-reopen-off` 46/46, `turn6-menu-off.json` 47/47,
  `turn6-rockslide-a`/`-b` 255/255+105/105, `turn7-rockslide-a` 256/256,
  `turn13-switchin` 242/242 (confirms the shared function's two OTHER
  call sites are unaffected — they never reach the live sub-window),
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `turn5-confirm-off-a`/`-b` are both now at their guard-family
  ceiling for this lane (`-b`'s own 6184 is the already-accepted boundary
  class, §4). Remaining #97 residuals are all owned elsewhere:
  `resolve-off-a`'s 6283/6284/6398 (side lane,
  `docs/turn5-resolve-ab-pools-diagnosis.md`), `resolve-off-c` 6763,
  `resolve-off-d` 6850/6996 (banked, this doc §1-§3).
- **Notes:** no PAPERCUT. Both fixes red-verified against pre-fix code
  via `git stash -- src/engine/battleScene.ts` before finalizing (all 3
  new pin assertions fail at exactly the predicted pre-fix values).
  Full derivation banked as §10 in
  `docs/turn5-single-frame-residuals-diagnosis.md`.
