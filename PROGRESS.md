# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 218 — Bounded worker (S7 engine slice Q, dedicated feathers step): rung (a) partially cracked — a real same-priority feather draw-order bug found+fixed (`compareFeatherDrawOrder`, ~2000px→425px residual on the 7421-7549 window, 9/129 ticks exact) but not a full 0-diff crack; rungs (b)/(c) landed clean — `turn7-feathers.json` **16/16**, `turn8-feathers.json` **33/33**, both 0 diff, confirming the SAME residual recurs at the identical relative offset in all three turns (ISSUES #30 filed)

- **State:** `npm test` **865/865** (+6), `npm run build` green, tree
  clean. `turn6-feathers.json` unchanged **106/106** (fix doesn't touch
  the already-green non-overlapping prefix). Zero regressions:
  `turn6-featherdance.json` 90/90, `turn6-menu.json` 42/42,
  `turn7-menu.json` 91/91, `turn8-menu.json` 86/86, `turn5-sitrus-
  a.json` 110/110, all 0 diff.
- **Did:** rung (a) — hand-derived the real GBA tiebreak rule from
  `reference/pokeemerald/src/sprite.c`'s `SortSprites` (lower OAM index
  wins ties; all 8 FEATHER_DANCE spawns share one `subpriority` per
  `Cmd_createsprite`, so this codebase's own `slot` is the practical
  proxy) and empirically confirmed descending-slot beats both ascending-
  slot (the old bug, reproduced exactly) and descending-Y (445px,
  slightly worse — rules out "a fresh Y-sort every frame" as the
  complete model). Shipped since it's strictly better and doesn't
  regress the committed 106/106, but the residual isn't fully gone —
  characterized precisely in §34/ISSUES #30 rather than force-fit.
  Rungs (b)/(c) — generalized `featherDance.ts` to a small factory
  (`makeFeatherSpriteLookup`), probed turn 7 (RAM 8434-8600) and turn 8
  (RAM 9483-9660) with the existing `dump-feather-dance-sprites.py`
  unchanged (both twice-run byte-identical), confirmed the identical
  +8-tick spawn cadence/~121-tick lifetime and the shared `+1` render
  lag (explicitly re-bisected against lag 0, which badly fails both:
  2/16 and 18/33 matches). Landed each turn's own clean prefix up to its
  first mismatch (turn7: 8439-8454, turn8: 9468-9500), matching turn 6's
  own reduced-scope precedent.
- **Next:** the ordering residual's real fix (model `sSpriteOrder`'s own
  persistent incremental insertion-sort state, or pursue the untried
  half-pixel sampling-center lead) — ISSUES #30. Independently: ISSUES
  #29 (2 small bounce-blip families), turn 9+ parameterizations.
- **Notes:** checked (not assumed) whether this crack explains ISSUES
  #23's DRAGON_BREATH residual — it doesn't (different mechanism: #23 is
  a single-sprite scale-regime sampling defect, not a multi-sprite
  draw-order contest), documented in §34 per the brief's own ask.

---
## 217 — Worktree scout (supervisor-folded): post-WIN scene transition ground-truthed — **the S8 dossier chain is now GAPLESS from anchor to battle 2**: `battle1-postwin-dense.json` (29601 ticks, 208 captures) joins turn17's end (23601) to §17's swap-prompt start (29601, endpoint sha byte-identical to `battle1-swapyes-a.json`'s same-tick frame); headline pins: **`gMain.inBattle` clears + per-VBlank RNG resumes at tick 23645**, and **opponent-2's identity (`rentalMons[3..5]`) is written by 23700-23750** — the timing-sensitive window §16 HEADLINE 4 warned about is now bisected to 105 ticks; `docs/postwin-notes.md` merged, suite 861/861

- **State:** merged into master post-#28-fix, `npm test` 861/861 +
  build green, worktree/branch cleaned. Supervisor re-verified:
  prefix chain re-flattened (turn17 ⊂ postwin ⊂ winline-b-swap,
  script-exact — the shared prefix serves BOTH swap branches since the
  joint precedes the YES/NO divergence), fresh rerun (208 captures,
  endpoint sha reproduced), 2 labels PNG-read (heal text in the
  pre-battle room at 23800; the settled YES/NO swap prompt at 29601).
  §16 HEADLINE 4 refined at this fold with the bisected window.
- **Did:** the return is a THREE-scene sequence (fade → ~38-tick flash
  of the S6 battle room → black → fade-in on S5's pre-battle room),
  both scenes already extracted/modeled — no new assets needed (camera
  path for the flash honestly flagged not re-verified). Heal RAM write
  lands 163 ticks AFTER the heal-text dismiss (screen frozen the whole
  gap); loss-quote cursor question remains open (honest flag).
- **Next:** round 8 — main: feathers dedicated step (turn-7/8 tables +
  §29 sampling-residual leads); worktree: ISSUES #29 probe (the two
  boundary families, same RAM-first method). Then turn 9+ slices; S8
  engine work now has complete ground truth end to end.
- **Notes:** scout in contract (16.3 of 40 min); PAPERCUT noted in the
  dossier (two supplementary RAM dumps run once, not twice — trace
  itself twice-run; acceptable, flagged in-doc).

---
## 216 — Bounded worker (S7 engine fix): **ISSUES #28 CLOSED** — `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` applied at the 3 turn-6/7/8 browsing-branch call sites; 20 of 26 named ticks restored 0-diff, 6 more surfaced as TWO DIFFERENT out-of-domain families (filed ISSUES #29) rather than force-fit

- **State:** `npm test` **861/861** (+4), `npm run build` green, tree
  clean. `turn6-menu.json` **42/42** (33 base + 6 period-9 + the separate
  7348-7350 set, 0 diff), `turn7-menu.json` **91/91** (85 base + 6, 0
  diff), `turn8-menu.json` **86/86** (78 base + 10, all 10 named ticks
  landed clean, 0 diff). Zero regressions across 12 rerun traces
  (`turn6-featherdance` 90/90, `turn6-feathers` 106/106, `turn6-statfall`
  127/127, `turn8-bind-a` 256/256, `turn8-bind-b` 66/66, `turn5-menu`
  42/42, `turn6/7-rockslide-*` all at committed counts).
- **Did:** re-ran `tools/probe/verify-bounce-blip-rule.py` FIRST per its
  own policy — 18/18 named ticks reproduced exactly, confirming the root
  cause before touching code. Fix: `battleScene.ts`'s 3 browsing-branch
  ternaries (`drawTurn6/7/8FightSubmenuWindow`, the `: t` arm) changed to
  `: t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` — the one-token change the probe
  banked. Restoring `captureFrames` then showed the model check (which
  computes the formula directly, blind to actual branch dispatch) had
  over-claimed 6 of the 26: **7315-7316** (turn 6) and **9383-9384** (turn
  8) land BEFORE `revealTick`, still in the pre-reveal idle window, not
  the browsing branch this fix touches; **8380-8381** (turn 7) lands right
  AFTER a confirm press inside `turn7-menu.json`'s own script, in the
  confirm/kickoff branch instead. Per the brief's own instruction, kept
  these 6 excluded rather than force-fitting, and filed them precisely as
  **ISSUES #29** (two distinct sub-families, both plausibly the same
  "missing shift" shape on a different anchor — a future probe's lead, not
  chased this session). 4 Tier-1 pins added (`tests/battleScene.test.ts`,
  new "ISSUES #28 fix" describe block): the shifted formula matches the
  committed RAM dumps at 3 restored ticks per turn (6 and 8), paired with
  a same-ticks pin proving the pre-fix unshifted formula would have
  mismatched — the fix is demonstrably load-bearing. Exported
  `TURN8_REGIME3_TO_REGIME1_SHIFT` (one word) so the turn-8 pin could
  reuse the real composition instead of re-deriving it. ISSUES #28
  deleted; `docs/bounce-blip-notes.md` got a "Fix landed" section with the
  full per-turn breakdown.
- **Next:** ISSUES #29 (the 2 newly-surfaced small families - a probe
  step, RAM-dump both driver sprites' y2 across the idle-branch reopen
  window and the kickoff-branch post-confirm window). Engine: turn 8's own
  feather sub-window, turn 9+ parameterizations. Then: feathers dedicated
  step (turns 6/7/8 tables), post-WIN scene-transition scout.
- **Notes:** landed in ~25 of the 30-minute cap. The brief's own
  "restore ALL the excluded ticks... if it does NOT pass, leave it
  excluded and say so precisely" fallback fired for real, twice, on ticks
  the prior probe step's own model check had marked as clean — a useful
  reminder that a pure-arithmetic model check doesn't see which code
  branch a tick is actually rendered through; pixel compare remains the
  final arbiter.

---
