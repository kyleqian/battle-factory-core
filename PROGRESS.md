# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 215 — Worktree probe (supervisor-folded): **ISSUES #28 ROOT-CAUSED** — the 26 period-9 excluded ticks across turns 6/7/8 are ONE engine bug: the turn-6+ browsing-branch dispatch drops `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (the existing constant every turn-1-5 wrapper applies); probe model-check fixes 18/18 RAM-probed named ticks with zero new mismatches, turn 7 retrodicts; the ~9 cadence is sinIndex(+7/tick) crossing ~64-wide plateaus, two seeds (192/128) → the region alternation; `docs/bounce-blip-notes.md` + verify script merged, suite 857/857

- **State:** merged into master post-#26-fix, `npm test` 857/857 +
  build green, worktree/branch cleaned. Supervisor verified the
  constant's existence and turns-1-5 usage in code directly
  (battleMenu.ts:843, `turn2ReopenedSubmenuBounceTick` et al.); pixel
  proof comes with the fix step's compare runs. ISSUES #28 rewritten:
  root-caused, one implementation step owed
  (`tools/probe/verify-bounce-blip-rule.py` committed for the fix
  worker to re-run first, per the residual-elimination policy).
- **Notes:** probe in contract (13.6 of 30 min). The session's probe
  scoreboard is now 3-for-3 (#27 attributed, #26 cracked+closed, #28
  root-caused) — every "quirk-at-an-extremum" label so far has fallen
  to a small real engine bug, none survived a dedicated probe.
- **Next:** round 7 — main: the #28 fix (3 call sites + restore 26
  ticks across turn6/7/8-menu traces + the separate 7348-7350
  restoration §28 already enabled); worktree: post-WIN scene-transition
  scout (loss quote 23601 → §17's swap-offer joint). Then: feathers
  dedicated step (turns 6/7/8 tables + §29's sampling-residual leads),
  turn 9+.

---
