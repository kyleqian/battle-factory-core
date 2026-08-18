# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 1333 — [main worker, 2026-08-18] **ISSUES #97 CLOSED: turn6 [7318,7347] bounce correction lands under a supervisor overturn of `turn6-reopen-endstate-spec.md`'s §2/§3 rejection — `turn6-reopen-off` 22/46→46/46, `turn6-menu-off` 23/47→47/47, both FULL**

- **State:** one green commit (`cb7cbee3` fix+Tier-1 pin) plus this docs
  commit. `npm test` **1,067 files / 10,045 passed (+1, the new
  [7318,7350] composed-model pin) / 223 skipped**; `npm run build` green.
- **Did:** per a supervisor decision overturning `docs/turn6-reopen-
  endstate-spec.md`'s own §2/§3 rejection (that doc's `turn6-menu.json`
  regression premise was refuted: that trace has no `oracleProfile` field
  — it's a legacy Battle Scene ON trace, not this lane's OFF ground truth;
  byte-comparing the two compare runs' own oracle captures showed the
  ORACLE PNGs differ at 34/44 overlapping ticks while the profile-blind
  APP PNGs are identical at 44/44 — full evidence in that doc's own
  2026-08-18 addendum). Landed the composed `[7318,7347]` correction:
  `turn6KickoffBounceTick`'s raw branch gets its missing
  `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` term (§10b); `drawTurn6FightSubmenu
  Window`'s post-reveal dispatch applies the shared `+60` raw-sine-index
  offset + `t-1` display basis to both the idle-else regime and this raw
  regime; the frozen tail `[7348,7350]` stays untouched (no dynamic RAM
  ground truth there, already correct). Composition re-derived from
  scratch against the receipt on the corrected (post-increment, `t-1`
  basis) footing per this step's own arithmetic caution — NOT the spec's
  own rejected `+67`/`t-1` combination — and proven exact (33/33 ticks)
  against `src/data/gen/turn5-6-reopen-bounce-probe.json` before any live
  compare. Two "content-owned presentation bridge" parity pins
  (`turn5ResolutionAdapter.ts`, `LEGACY_TURN6_FIGHT_COMMAND_PRESENTATION`
  in `battleScene.ts`) updated in lockstep to keep reproducing the real,
  now-fixed function.
- **Result:** `turn6-reopen-off.json` 22/46 → **46/46** (full match, beats
  the ≥40/46 target); `turn6-menu-off.json` 23/47 → **47/47** (full
  match). Expected, accepted ON-profile movement (legacy traces, out of
  this lane's oracle contract): `turn6-menu.json` 34/44→10/44,
  `turn6-featherdance.json` 82/90→64/90, `turn6-feathers.json`
  227/235→209/235 — all inside `[7307,7347]`, the exact touched span.
  Zero regressions across every hard guard: `turn5-sitrus-d` 15/133,
  `turn5-action-off` 32/32, `turn5-reset-off` 256/256,
  `turn5-confirm-off-{a,b}` 60/132 and 0/132 (689px/1.79% unchanged),
  `turn5-resolve-off-{a,b,c,d}` 25/196, 88/196, 149/196, 0/196
  (258px/0.67% unchanged), `win-terminal-window-off` 3590/3590. ISSUES
  #97's `turn6KickoffBounceTick`/7318+ dispatch remainder is fully closed
  (new §E dated sub-entry); full before/after table in
  `docs/turn6-reopen-endstate-spec.md`'s addendum.
- **Next:** ISSUES #97 stays open only for its unrelated remainders:
  `confirm-off-b`'s 689px residual (`drawTurn5RockSlideWindow` attack/text
  phase), `resolve-off-d`'s 258px residual (settled-Sitrus-chrome ONIX
  overlay), `resolve-off-c`'s trailing 47-frame secondary mechanism
  (§3e/§7, untraced), and the Class-(iii) text/banner mechanism (§8g) —
  none touched by this session. #71 Rung 9 unchanged (blocked on the
  animation lane's rung-4 back dispatcher).
- **Notes:** no PAPERCUT. The arithmetic-caution flag in this step's own
  brief (receipt columns are post-increment) was worth the up-front
  `npx tsx` modeling pass — it caught that the spec's own `+67` fit needed
  the same `-7` correction window B's landed fix already applies, so the
  composed formula matched the receipt exactly (33/33) on the first live
  compare, no iteration needed.


---
## 1332 — [main worker, 2026-08-18] **ISSUES #97 §17 item 5 landed: HP-overlay gate's turn4 arm closes turn5-confirm-off-a's frozen-HP frames (15→60/132), zero decreases across the guard family**

- **State:** two green commits (`e7657a86` fix+Tier-1 pin, `0ac71a47`
  docs) plus this docs commit. `npm test` **1,067 files / 10,044 passed
  (+1, the new turn-4-arm pin) / 223 skipped**; `npm run build`/
  `npm run typecheck` green.
- **Did:** per-caller audit FIRST (required by the brief), all 12 real
  call sites of `drawActionMenuIdleContentFromLatest` traced to their own
  turn/window and checked for an override arg and today's gate outcome —
  recorded as `docs/turn5-family-class3-diagnosis.md` §19. Confirmed §10a's
  root cause exactly: `drawTurn5EndeavorText`'s ENDEAVOR-hold fallback is
  the ONLY call site where the gate's `false` outcome wasn't already masked
  by a manual redraw of the same value right after the call (two callers,
  `drawTurn3/4RockSlideTurnEndSettledMenu` and `drawActionMenuIdleWindow`'s
  two branches, already draw the identical override unconditionally, so
  widening the gate there is provably a no-op, not a behavior change).
  Chose fix shape (a) over (b) (§10a's two candidates): added a third OR
  arm, `turn4FightCommandPresentationFromLatest(latest) !== null`,
  mirroring the existing turn2/turn3 arms one turn further — the same
  pattern `drawTurn3EndeavorText` already relies on via the turn2 arm one
  turn earlier. Tier-1 pin: `battleSceneFightCommandPresentationTurn1
  Through4.test.ts`'s "slice 3" describe block, previously asserting "turn
  4: does NOT fire" for the generic shim — split into the retired
  positional-ABI body's own unchanged historical pin plus a new case
  pinning the current shim's turn-4 arm firing.
- **Result:** `turn5-confirm-off-a` 15/132 → **60/132** (strict
  improvement, oracle-verified). `turn5-confirm-off-b` and
  `turn5-resolve-off-d` both held their prior 0-match count with their
  cited residual magnitude UNCHANGED (689px/1.79% bbox=16,124-75,149 and
  258px/0.67% bbox=44,71-195,104 respectively) — both attributed to
  different, ungated code paths this fix cannot reach
  (`drawTurn5RockSlideWindow`'s attack/text phase and its own
  settled-Sitrus-chrome tail; traced, not guessed — see §19). Zero
  decreases anywhere in the 9-trace guard family: `turn5-reset-off`
  256/256, `turn5-action-off` 32/32, `turn6-reopen-off` 22/46, `turn6-menu`
  34/44, `turn5-resolve-off-{a,b,c}` 25/196, 88/196, 149/196,
  `turn4-doubleteam-off`/`turn4-rockslide-off` 256/256 each — all
  byte-identical to the brief's own cited baselines.
- **Next:** ISSUES #97 remainders, all still open, all now attributed to a
  specific code path (not this gate): `confirm-off-b`'s 689px residual
  (`drawTurn5RockSlideWindow` attack/text phase — item 1's own boundary,
  possibly a text-timing recalibration, not an HP overlay); `resolve-off-d`'s
  258px residual (settled-Sitrus-chrome ONIX overlay, needs its own
  instrument); `resolve-off-c`'s trailing 47-frame secondary mechanism
  (§3e/§7, untraced); `turn6KickoffBounceTick`/the 7318+ dispatch (side-lane
  continuation, unchanged). #71 Rung 9 unchanged (blocked on the animation
  lane's rung-4 back dispatcher).
- **Notes:** no PAPERCUT. §19's per-caller audit (required before any edit)
  took the bulk of the session but paid off — it predicted every trace's
  outcome (including the two "stays at 0 but why" residuals) before a
  single oracle rerun, and every prediction held exactly.

---
## 1331 — [main worker, 2026-08-18] **ISSUES #71 §1e retirement COMPLETE: Rungs 7-8 land the final 25 sites, closes 119/119 in-scope `battleScene.ts` call sites, zero FINDINGs across all 9 rungs**

- **State:** two green commits (`a57d281b` Rung 7, `f70b6e67` Rung 8) plus
  this docs commit. `npm test` **1,067 files / 10,043 passed / 223
  skipped** (unchanged — neither rung needed a new pin, unlike Rung 5's
  HARDEN) after each commit; `npm run build`/`npm run typecheck` green
  throughout.
- **Did:** followed `docs/sendout-1e-retirement-design.md` §5 Rungs 7-8
  exactly, re-grepping every site's current line number first (both
  rungs' lines had drifted from the doc's own stale cites, as its own
  warning predicted) and confirming every per-move Tier-1 test filename
  with `find` before scoping. **Rung 7** (15 sites, WISH…TAKE_DOWN,
  `:37684-43476` this session): WISH (2 sites), RECOVER, FUTURE_SIGHT,
  CONFUSION, PSYCHIC, METAL_CLAW already carried a dynamic
  `view.target.species`/`view.attacker.species` argument — fallback-idiom
  swap only. METEOR_MASH, MILK_DRINK, REFRESH, FLAME_WHEEL, DRAGON_CLAW,
  FIRE_SPIN, CRUSH_CLAW, TAKE_DOWN had a hardcoded ONIX literal, each
  converted to `view.target.species` after independently confirming that
  move's own `playerToOpponent`/`opponentToPlayer` throw-guard proves it.
  METEOR_MASH's doc-flagged caveat confirmed exactly as written: covered
  by `meteorMashSource/Evidence/Reducer.test.ts`, not a plain
  `meteorMash.test.ts`. **Rung 8** (10 sites, CRUNCH…DOUBLE_EDGE,
  `:43605-44867`): all 10 moves (CRUNCH, LICK, SLASH, COUNTER,
  COMET_PUNCH, DOUBLE_SLAP, TRIPLE_KICK, DOUBLE_KICK, THRASH,
  DOUBLE_EDGE) shared byte-identical
  `speciesFrontIdleRestOffset("ONIX") ?? {x2:0,y2:0}` call-site text; each
  move's own guard was still confirmed individually (not assumed from the
  shared shape) before substituting `view.target.species`. Every site's
  fallback idiom collapsed to Rung 0's `speciesFrontIdleRestOffsetOrZero`
  in the same edit; throw-guard/pair-lock blocks untouched everywhere, as
  in every prior rung. **Zero FINDINGs across both rungs** — no
  substituted expression ever disagreed with what its guard proved.
- **Result — §1e CLOSED:** the doc's own final census grep, re-run after
  Rung 8: `grep -c speciesFrontIdleRestOffset( battleScene.ts` → **4**
  (exactly the doc's §1.2 permanently-out-of-scope settle-hook literals:
  GROVYLE `:5372`, KABUTO `:6486`, PIDGEOTTO `:11187`, MURKROW `:11324` —
  unchanged, never in scope); `grep -c speciesFrontIdleRestOffsetOrZero(`
  → **119**, matching the doc's §1.2 "Inside renderSceneOnMovePresentation
  | 119 | The §1e debt" row exactly — **119/119 in-scope sites retired**,
  raw+OrZero summing to the same constant 123 held since Rung 0.
  `sceneOnPresentation.ts`'s 2 already-generic sites (`:4960`, `:9416`,
  DRAGON_RAGE/SHADOW_PUNCH) are untouched and correctly so — per §3 they
  were never part of any rung, already using the ideal shape this whole
  ladder exists to spread. Every named per-move Tier-1 test file green
  each rung (24 files/116 tests Rung 7, 24 files/94 tests Rung 8, several
  files shared with earlier rungs' confirmation passes but independently
  re-run here); `npm run compare:differential -- battle-command-
  generated-off.json --base <rung's parent sha> --summary` 128/128
  byte-identical both rungs (insurance smoke check — none of these
  windows are reachable from that trace).
- **Next:** §1e retirement is done; no more rungs of this shape remain.
  ISSUES #71 itself stays open — its one remaining item is **Rung 9**
  (hand-fit consumer swap-over: `magbySendOut.ts`, the `battleMenu.ts`
  ONIX-back hand-fits, `kabutoSendOut.ts`'s `kabutoHSlideWobble`), which
  is **blocked on the animation lane's rung-4 back-family dispatcher** (68
  functions, not started) per the doc's §5 Rung 9 section — not this
  lane's to start, do not attempt until that dispatcher exists and
  exports a callable per-species+nature back-offset function. Do not edit
  `ISSUES.md`; #71 stays open for that reason alone.
- **Notes:** no PAPERCUT. Landed well inside the 40-min cap — both rungs'
  site-context (guard shapes, test filenames) were either already
  established by the prior session's identical recipe or quick to
  re-confirm, so no time was lost re-deriving the pattern.
