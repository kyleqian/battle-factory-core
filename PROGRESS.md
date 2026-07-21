# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 220 — Bounded worker (S7 engine slice R, rungs (a)+(b)): **ISSUES #29 FIXED** (both families, all 3 menu traces restored 0 diff) **+ turn 9's menu-reopen/LEFT-nav/confirm/QUICK_ATTACK-kickoff-text chain landed clean** — `turn9-menu.json` **111/111**; QUICK_ATTACK's own animation + everything downstream (impact/drain/message/ROCK_SLIDE/turn-end) NOT modeled — RAM-probed and precisely characterized (§35), not guessed

- **State:** `npm test` **877/877** (+12), `npm run build` green, tree
  committed. `turn6-menu.json` 44/44, `turn7-menu.json` 93/93,
  `turn8-menu.json` 88/88 (rung a's restoration), `turn9-menu.json`
  **111/111** (new, rung b: reopen through the kickoff text's own
  settled plateau, one tick before the animation's first pixel change
  at 10929). Zero regressions across the full menu/kickoff/rockslide/
  feathers sweep (`turn8-bind-a/b.json` 256/256+66/66, `turn7-
  rockslide-d.json` 19/19, `turn6-rockslide-a.json` 255/255,
  `turn6/7/8-feathers.json` 106/16/33, `turn6-featherdance.json`
  90/90).
- **Did:** Rung (a) — verify script re-run FIRST (both families PASS)
  per policy; Family A (`drawTurn6ActionMenuIdleWindow`/
  `drawTurn7RockSlideTurnEndSettledMenu` gained an optional
  `bounceTick`/`bounceRawTick` param, default `t`); Family B
  (`turn7KickoffBounceTick`'s pre-freeze branch now shifts). ISSUES
  #29 deleted. Rung (b) — `turn8Resolved` state flag (mirrors
  turn1-7Resolved), cursor persists at BIND(1) then `LEFT` returns it
  to ROCK_SLIDE(0) via the already-generic `cursor^1` arithmetic, PP
  ledger gains BIND's own miss-still-decrements-PP rule (19/20), a
  4th bounce regime (`TURN9_REGIME4_TO_REGIME1_SHIFT`), QUICK_ATTACK's
  own kickoff text (timing fit against a FRESH oracle run, not the
  dossier's own loose prose range — that undershot by 4 ticks),
  `turnOrder.ts`'s nonzero-priority branch gets its first real-scenario
  Tier-1 pin (QUICK_ATTACK +1 forces Pidgeotto first).
- **Next:** QUICK_ATTACK's animation (RAM ground truth already banked
  in §35: task window 10925-10949, `AnimTask_TranslateMonElliptical_
  Step`+`AnimTask_TraceMonBlended_Step`+`AnimTask_ShakeMon_Step`,
  sprite slots 2/3/4/7) through the impact/drain/"not very
  effective"/ROCK_SLIDE(82→61)/turn-end — one contiguous block, not
  attempted this session (time). `docs/turn9-notes.md` has the full
  ledger.
- **Notes:** docs updated in the same commit — `docs/bounce-blip-
  notes.md` "Fix landed" section, `docs/battle-turn-notes.md` §35,
  `ISSUES.md` #29 deleted. PAPERCUT: the turn9-notes.md dossier's own
  prose timing ranges (e.g. "text typing in 10878-10929") are
  approximate orientation, not exact render constants — cost ~5 min
  re-fitting `TURN9_QUICKATTACK_TEXT_DELAY` against a fresh oracle run
  instead of trusting the cited range directly.

---
## 219 — Worktree probe (supervisor-folded): **ISSUES #29 ROOT-CAUSED, both families** — the same missing-`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` mechanism as #28, one dispatch branch earlier (Family A: pre-reveal idle window must key the shift off `openElapsed !== null`, not `revealTick`; Family B: `turn7KickoffBounceTick`'s pre-freeze branch returns unshifted `t`); supervisor re-ran the committed verify script — both families PASS, zero neighbor regressions; probe scoreboard this session: **4-for-4** (#27, #26, #28, #29); merged, suite 865/865

- **State:** merged into master post-feathers, `npm test` 865/865 +
  build green, worktree/branch cleaned. ISSUES #29 rewritten to
  one-fix-step-owed with the probe's rules + the honest open flag
  (turn 6/8 kickoff wrappers share Family B's code shape, unprobed).
- **Next:** round 9 — main: #29 fix as rung (a) (verify-script-first,
  restore 6 ticks: menus → 44/93/88) + turn 9 slice as rungs (b+)
  (turn9-notes.md exists; both published lines reconverge at turn 9);
  worktree: ISSUES #30 probe (simulate SortSprites' persistent
  adjacent-swap order over the committed feather probe tables — all
  inputs committed, pure computation; then the half-texel lead).
- **Notes:** probe in contract (12.0 of 30 min). Every excluded tick
  in turns 1-8 now has either a root-caused fix pending (#29's 6) or
  a live named-lead investigation (#30's feather windows); no
  speculative labels remain.

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
