# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 138 — Supervisor: WIN-chain scout merged — **battle 1's WIN, swap decline, and battle 2's first action menu fully ground-truthed at tick 33031** (11969 under the new 45000 cap); S8's acceptance chain is now provably pinnable

- **State:** `npm test` **669/669**, `npm run build` green, tree clean at
  merge `2eed99a`; no worktrees, no unmerged branches.
- **Did:** verified (suite in worktree, 33031-frame trace re-run on the
  restarted service, final frame visually confirmed: KABUTO vs healed
  ONIX 117/117 at a settled action menu) and merged the worktree scout:
  Magby chosen over Bayleef on RAM-dumped evidence, Murkrow killed in 2
  turns (Magby survives 27/138), burn residual pinned `floor(maxHP/8)`,
  full victory text → free heal → GO ON → swap offer declined →
  battle 2 = FISHERMAN JENSON / KABUTO. Traces
  `battle1-winline-b{,-swap}.json` + 3 RAM dumps + §16 (ledger
  discipline). Load-bearing methodology note (§16): OUTSIDE battle,
  idle-timing DOES shift RNG (per-VBlank advance resumes) — battle 2's
  opponent identity is timing-sensitive; scripts extending the chain
  must reuse the committed segments verbatim. Also verified+accepted
  #137 (slice E1b drain+digits, turn2-endeavor-drain 105/106; ENDEAVOR
  anim descoped on source evidence — real custom assets).
- **Next:** (1) main lane: ENDEAVOR attack-anim asset slice (ticks
  3003-3094, `Move_ENDEAVOR` at battle_anim_scripts.s:3789) to complete
  turn 2's first half; then E2 (DRAGON_BREATH window 3129-3846); (2)
  worktree lane: swap-YES branch + factory swap screen ground truth +
  asset inventory (S8's only un-scouted UI); (3) ISSUES #19 family
  (3 traces now), #20 rewire remainder.
- **Notes:** none.

---
## 137 — Bounded worker: S7 slice E1b — Onix's own HP-bar drain (117→101) + player-healthbox HP digits, `turn2-endeavor-drain.json` **105/106** (the 1 residual is the same ISSUES #19 family already accepted in `turn2-endeavor.json`) — suite **669/669**; ENDEAVOR's own attack animation stays OUT OF SCOPE (real custom asset, not "plain generic" as briefed)

- **State:** `npm test` **669/669** (+9 Tier-1 pins), `npm run build`
  green, tree clean. New committed trace
  `tools/compare/traces/turn2-endeavor-drain.json` (same verbatim 44+6
  prefix as `turn2-endeavor.json`, idle extended to tick 3132, +29
  captures dense 3095-3120 + 3 settle samples) **105/106**. Zero
  regressions at exact prior counts: `turn2-endeavor` 76/77 (untouched),
  `turn1-rockslide` 256/256, `turn1-drain` 102/102, `fight-submenu`
  234/235, `turn1-kickoff` 81/81, `turn1-cloneanim` 230/230.
- **Did:** landed the drain+digits half of slice E1b, per the brief's own
  fallback clause, after source-checking (not assuming) that ENDEAVOR's
  own attack animation is genuinely custom asset work (`Move_ENDEAVOR`:
  attacker squish/sweat-droplet/yellow-blend task + two rounds of
  target shake+hitsplat, `data/battle_anim_scripts.s:3789`) — NOT the
  "plain generic hit, no move-specific asset" the handoff assumed.
  Oracle-confirmed the animation's own onscreen window is 3003-3091
  (whole-frame diff against the tick-2999 baseline), settling back to
  an exact match (aside from the healthbox itself) from 3095 on — so
  this session's own trace captures densely from 3095 through the
  settle, explicitly skipping 3003-3094. `endeavorOnixHp` (`battleMenu
  .ts`) reproduces `rockSlideOpponentHp`'s exact shape with its own
  anchor delay (153, not 597) — grid-search-confirmed the same "no
  extra render lag" rule holds player-side too (verified independently,
  not assumed, since the player/opponent controllers are different
  source files). `composePlayerHealthboxHpOverlay`
  (`healthboxAssembly.ts`) is a small sparse patch (bar fill + FONT_SMALL
  digit text) layered on the existing flat player-healthbox harvest,
  NOT a full frame compositor (that's its own future slice, a player-
  side ISSUES #16 analogue) — caught a real bug mid-session where an
  initial fit reused the opponent's own 11-row text-window constants
  verbatim (ink-exact, but clobbering 2 rows of the frame's own static
  divider line with the printer window's own bg-fill color); re-fit
  against a wider pixel check (not just ink) found the real 9-row
  footprint, now Tier-1-regression-guarded. Full derivation in
  docs/battle-menu-notes.md §14.
- **Next:** ENDEAVOR's own attack animation (new sweat-droplet/hitsplat/
  squish-blend assets, ticks 3003-3094 — a real asset-extraction slice,
  not a formula reuse) is the natural continuation of this exact window;
  otherwise DRAGON_BREATH's own window (3129+, slice E2) or ISSUES #19's
  anomaly family.
- **Notes:** no papercuts.

---
## 136 — Supervisor: S8's blocking question answered (WIN unreachable at 20000) → **user decision: oracle frame cap raised to 45000** (harness `ccd7554`, service restarted + verified); §15 winline scout merged — Pidgeotto-KO line verified (tick 15887), Murkrow's first RAM ground truth

- **State:** `npm test` **659/659**, `npm run build` green, tree clean at
  the merge commit `f8b0649`; no worktrees, no unmerged branches. Oracle
  answers with `maxFrames: 45000` (smoke-tested on anchor.json).
- **Did:** (1) Worktree scout (merged): confirmed idle-timing is NOT an
  RNG lever (probe: +4-frame shift reproduces §12's ledger shifted +4) —
  move-choice sequence is; found+verified a line KO'ing Pidgeotto at tick
  15887 (BIND at turn 8), settled menu vs Murkrow at 17722; Murkrow RAM
  ground truth (Lv50 142/142 DARK/FLYING, INSOMNIA, LAX INCENSE, Spd 97,
  FAINT_ATTACK/FLY/TORMENT/TAUNT); Onix (4/117 after felling Pidgeotto)
  faints at 19147 dealing 0 to Murkrow — WIN provably misses the 20000
  cap for every plausible line (floor ≈22500 incl. swap + battle-2 menu).
  Traces `battle1-winline-a{,-murkrow}.json` + 2 RAM dumps + new probe
  `dump-battler-full.py` committed (§15). (2) Escalated; user chose
  raising the cap over snapshot/restore or re-scope: harness commit
  `ccd7554` (`MAX_FRAMES = 45_000`), service restarted, verified.
  ROADMAP S8 + Domain notes updated. (3) Verified+accepted workers #134
  (shake residual, turn1-rockslide 256/256) and #135 (slice E1,
  turn2-endeavor 76/77) — see their entries.
- **Next:** (1) scout lane: ground-truth the full WIN → swap → battle-2
  first-menu line under the 45000 cap (extend §15's winline; keep Onix
  healthier / voluntary switch options open); (2) main lane: slice E1b —
  ENDEAVOR attack anim + Onix HP drain 116→101 + player-side HP-digit
  compositor (ticks 2999-3128, §13 handoff: digits are FONT_SMALL,
  already extracted); then E2 (DRAGON_BREATH window, 3129-3846); (3)
  ISSUES #19 family (now 2 traces affected), #20 rewire remainder.
- **Notes:** oracle restart was deferred until the main lane was idle (a
  mid-flight restart would have broken E1's compares). Old cap's two
  stale Thursday `server.py` processes (not on :8012) left untouched.
