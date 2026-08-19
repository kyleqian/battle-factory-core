# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---

## 1344 — [main worker, 2026-08-18 session 5] **ISSUES #97: `drawTurn5RockSlideAttack`'s three §17/§5-named mechanisms LANDED — `resolve-off-a` 60/196 -> 175/196 (three commits, all green)**

- **State:** three green commits (`9ec92966` phantom rock-prop drop,
  `1e8096fc` sink+healthbox-vanish 2-tick fix, plus this docs commit).
  `npm test` **1,067 files / 10,093 passed (+5 new pin blocks) / 223
  skipped**; `npm run build`/`npm run typecheck` green.
- **Did (step 1, §17.4):** dropped `drawTurn5RockSlideAttack`'s
  falling-rock draw loop entirely (unconditional, no scene-ON call site
  to preserve) — real hardware's OAM has zero rock-shaped (32x32)
  entries anywhere across turn 5's 6258-6354 window (§17.1's full
  census); matches `drawTurn9RockSlideAttack`'s own already-landed
  precedent exactly. `resolve-off-a` 60/196 -> 158/196 (98 frames, zero
  regressions).
  **Did (step 2, §19):** a dense oracle pixel sweep (GROVYLE's own
  column x=165) found the sink formula (`faintSinkRowsAndY2`, called
  unshifted from this function) runs a uniform 2 render ticks BEHIND
  real hardware — scoped `+2` shift at the call site only (shared
  function/its Tier-1 pins/turn 13's own separate call site untouched).
  Closing the sink exposed a sibling 2-tick lag in the adjacent
  healthbox-vanish gate (`GROVYLE_HEALTHBOX_VANISH_TICK`, its own single
  reader) — fixed the same way, scoped `-2`. `resolve-off-a` 158/196 ->
  175/196 (17 frames, zero regressions).
- **Result:** `turn5-resolve-off-a` **60/196 -> 175/196** (below the
  brief's own directional 170-180 estimate at the low end but landed in
  range). Full guard family reran after EACH step with **zero
  decreases**: `-b` 196/196, `-c` 195/196 (6763 unchanged, other lane's
  track), `-d` 194/196 (**6850 and 6996 both unchanged** — neither
  banked hypothesis panned out, this fix's mechanism isn't shared),
  `turn5-reset-off` 256/256, `turn5-action-off` 32/32, `turn6-reopen-off`
  46/46, `turn6-menu-off.json` 47/47, `turn5-confirm-off-a` 128/132
  (5959-5961/5968 unchanged), `-b` 131/132 (6184 unchanged),
  `turn6-rockslide-a`/`-b` 255/255, 105/105, `turn7-rockslide-a`
  256/256, `turn13-switchin` 242/242 (confirms neither scoped shift
  leaks into turn 13's own reuse), `turn4-doubleteam-off`/
  `turn4-rockslide-off` 256/256 each.
- **Next:** `resolve-off-a`'s remaining 21/196 (6283/6284 + 6379-6398) is
  a **different function's** own "Foe GROVYLE fainted!" text-reveal
  timing (`drawTurn5RockSlideWindow`, not `drawTurn5RockSlideAttack`) —
  banked as `docs/turn5-resolve-ab-pools-diagnosis.md` §19.1 with a named
  next probe (dense visible-char-count sweep, §4a's own solve method),
  not chased this session per the step brief's time-boxing. `-c` 6763
  and `-d` 6850/6996 remain other lanes' own tracked residuals.
- **Notes:** no PAPERCUT. Both fixes red-verified against pre-fix code
  via `git stash` before finalizing, per the family's own convention.

---

## 1343 — [main worker, 2026-08-18 session 4] **ISSUES #97's four named single-frame residual groups (PROGRESS 1342 open item (b)) all BANKED with decisive new evidence, none fixed — one precedent-matched bounce fix tried and empirically falsified, cleanly reverted**

- **State:** zero `src/` changes landed (`git diff -- src/` clean); one
  docs+probes commit. `npm test` **1,067 files / 10,088 passed (unchanged)
  / 223 skipped**; `npm run build` green. Full guard family reran with
  **zero decreases** everywhere, matching every baseline exactly:
  `turn5-resolve-off-a` 60/196 (the out-of-scope guard bar, untouched),
  `-b` 196/196, `-c` 195/196, `-d` 194/196, `turn5-reset-off` 256/256,
  `turn5-action-off` 32/32, `turn6-reopen-off` 46/46, `turn6-menu-off.json`
  fixture 47/47, `turn5-confirm-off-a` 128/132, `-b` 131/132,
  `turn6-rockslide-a` 255/255, `-b` 105/105, `turn7-rockslide-a` 256/256,
  `turn13-switchin` 242/242, `turn4-doubleteam-off`/`turn4-rockslide-off`
  256/256 each.
- **Did:** pixel-first diagnosis of all four residual groups PROGRESS
  1342 open item (b) named, per the standing #97 method, plus RAM probes
  where pixels alone were ambiguous. New doc (owned):
  `docs/turn5-single-frame-residuals-diagnosis.md`. **(1) `resolve-off-c`
  tick 6763**: new OAM evidence (fresh RAM probe) supersedes the prior
  session's "AA-class rounding" framing — the real healthbox sprite is a
  64px-wide hardware OBJ (`shape=1,size=3`) based at real screen `x=44`,
  while our software composites a 128px single canvas anchored at
  `origin.x=12`; at the slide's onset tick the real sprite is fully
  off-screen (max `x=-3`) while our wider canvas's own far column happens
  to peek onto screen at `x=0-2` — a geometry mismatch, not a rounding
  fringe. Next probe named (find the real HP-bar sub-sprite's own base X).
  **(2) `resolve-off-d` tick 6850**: pixel-confirmed the same
  already-accepted "PNG(T) shows RAM(T-1)" dispatch-boundary class as
  tick 6184 — architecturally inherent to the hard cutover, not
  independently chased. **(3) `resolve-off-d` tick 6996**: the inherited
  "cursor-adjacent, do not touch" label was stale — current post-fix bbox
  (`127,74-229,110`) no longer overlaps the button-grid/cursor region at
  all; likely shares a root cause with `resolve-off-a`'s own **out-of-
  scope** static-background residual (same draw path), so per this step's
  own explicit stop-and-bank instruction, banked without attempting a fix
  to protect the `resolve-off-a` 60/196 guard bar. **(4) `confirm-off-a`
  ticks 5959-5961/5968**: tried the precedent-matched fix (the sibling
  idle-wait bounce branch's own oracle-RAM-proven `+109`/`t-1`
  correction, applied to the structurally-identical confirm-wait branch)
  — **regressed** `turn5-confirm-off-a` 128/132 → 125/132 (six
  previously-matching frames broke). Reverted immediately, verified clean.
  The failure itself is decisive evidence: the frozen-phase value (used
  for 5962-5967, already matching) and the live-phase value at 5959 are
  provably identical (same `sourceTick`), ruling out a bounceTick-value
  bug entirely — the residual is a compound of at least two disjoint
  screen regions (Onix-sprite x=44-99, a separate unexplained x=127-229
  region) plus a likely-separate boundary artifact at 5968. **(5)
  `confirm-off-b` tick 6184**: independently reconfirmed as the same
  already-accepted boundary class via fresh pixel sampling, not
  re-chased. Two new committed probes:
  `tools/probe/analyze-residual-family-sample.ts` (generic reusable bbox
  pixel-diff dumper) and `tools/probe/dump-turn5-confirma-bounce-driver.py`
  (bounce driver RAM fields, windowed to confirm-off-a's own 5955-5970).
- **Next:** four concrete next probes, one per residual, named in
  `docs/turn5-single-frame-residuals-diagnosis.md` §1.3/§2.2/§3.3/§5.5.
  `resolve-off-a`'s own 6262-6376 band (side-lane territory this round)
  and #71/#73/#55 unchanged.
- **Notes:** no PAPERCUT. ISSUES #97 given a short dated status line
  recording this round (entry not restructured).

