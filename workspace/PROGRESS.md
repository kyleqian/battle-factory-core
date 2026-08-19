# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1345 — [main worker, 2026-08-18 session 6] **ISSUES #97: `drawTurn5RockSlideWindow`'s fainted-text dispatch gate + glyph reveal (§19.1's named next probe) LANDED — `resolve-off-a` 175/196 -> 193/196 (one commit, green)**

- **State:** one green commit (`98fe3385` fix + 2 Tier-1 pins) plus this
  docs commit. `npm test` **1,067 files / 10,096 passed (+3) / 223
  skipped**; `npm run build`/`npm run typecheck` green.
- **Did:** per §19.1's own named next probe, a dense oracle pixel sweep
  (6373-6399, `--capture-range`) plus a scratch script computing each
  character's own measured glyph-column boundary (via the real
  `measureText`/font/charmap) solved the mismatch precisely: real
  hardware's fainted-message glyph reveal AND its dispatch gate (the
  switch away from the prior "ONIX used ROCK SLIDE!" text) both run 1
  render tick ahead of real hardware in `drawTurn5RockSlideWindow` — a
  uniform `t - 1` display-basis correction at this function's own two
  dispatch points (`battleScene.ts:15032`/`15046`), same shape already
  used elsewhere in this file. `turn5FaintedTextStartTick`/
  `turn5FaintedTextVisibleChars` themselves are untouched.
- **Result:** `turn5-resolve-off-a` **175/196 -> 193/196** (18 newly
  matched frames, exceeding the step's 190+ target). `6398` (the
  fainted-message wait-cursor) confirmed unchanged — a separate,
  already-census'd Class C bug, not this session's mechanism. Full guard
  family reran with **zero decreases**: `-b` 196/196, `-c` 195/196 (6763
  unchanged), `-d` 194/196 (6850/6996 unchanged), `reset-off` 256/256,
  `action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
  47/47, `confirm-off-a` 128/132 (5959-5961/5968 unchanged), `-b` 131/132
  (6184 unchanged), `turn6-rockslide-a`/`-b` 255/255, 105/105,
  `turn7-rockslide-a` 256/256, `turn13-switchin` 242/242,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each.
- **Next:** `resolve-off-a`'s remaining 3/196 is `6283`/`6284` (2px
  each) — pixel-isolated to an exact single UI element inside GROVYLE's
  healthbox (an "HP"-icon-colored pixel pair swapping to the healthbox
  frame color), RAM-correlated to the same 2-tick-lag family
  (`battleBars[1]` struct restart at RAM 6282, pixel-visible 6283, 2
  ticks ahead of the literal `gBattleMons[1].hp` zero-step at 6285) but
  the responsible TS draw path not yet identified (both per-tick
  formulas that feed this function's healthbox draw are ruled out —
  ordinary opponent-hp drain and the hit-reaction wobble are both static
  across this window). Banked with a named next probe
  (`docs/turn5-resolve-ab-pools-diagnosis.md` §19.4) rather than guessed
  at. `6398` (Class C cursor), `-c` 6763, and `-d` 6850/6996 remain other
  lanes'/mechanisms' own tracked residuals.
- **Notes:** no PAPERCUT. Fix red-verified against pre-fix code via
  `git stash -- src/engine/battleScene.ts` before finalizing (2 of the 3
  new pins fail as expected pre-fix; the third is a pure sanity pin on
  the untouched shared function, correctly holds either way).
