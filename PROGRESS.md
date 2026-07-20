# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 139 — Bounded worker: S7 slice E1c — ENDEAVOR's own attack animation, GROUNDWORK ONLY (2 gfx assets extracted + full 5-mechanism source derivation + oracle-timed transition table, `docs/battle-menu-notes.md` §15); engine wiring NOT landed, this session's own explicit scope call — suite unchanged **669/669**

- **State:** `npm test` **669/669** (unchanged, no engine code touched),
  `npm run build` green, tree clean. New gen assets
  `src/assets/gen/battle-anim-{sweat-drop,hitsplat}.json`; `endeavor` key
  added to `src/data/gen/battle-move-anim-tables.json`. No trace
  added/changed (deliberate — see below).
- **Did:** source-read `Move_ENDEAVOR` (`battle_anim_scripts.s:3789-3803`)
  and found FIVE concurrent sub-mechanisms, not the "generic hit" the
  original handoff assumed and #137 already flagged: attacker 2-axis
  squish (affine scale — the engine's only existing affine renderer is
  uniform-scale-only, built for materialize), 16 sweat-droplet sprites
  (new gfx + particle physics), a 16-color palette blend ramp (new
  primitive, distinct from the existing `blendedTile` alpha-compositor),
  two target-shake task instances, two hitsplat sprites (new gfx + its own
  affine "pop"). Extracted both new gfx assets (`sweat_drop.png` 1 tile,
  `impact.png` 16 tiles) via the established `extract-battle-move-anim-
  assets.ts` convention; hand-derived exact formulas for all five
  mechanisms from source (steps/offsets/timings, see §15); ran a scratch
  dense every-tick oracle capture (2999-3095, not committed) and built a
  full bbox-transition table — confirms §14's coarse "two 0-diff lulls"
  finding at full resolution and isolates a clean squish-only sub-window
  (3000-3007, attacker side only, before droplets/shake/hitsplat
  contaminate it) as the cheapest possible incremental landing point.
- **Next:** wire the engine per §15's "what a follow-up session needs"
  list, in order of leverage: (1) a 2-axis affine sprite renderer
  (generalizes the existing materialize one); (2) land the isolated
  3000-3007 squish-only sub-window as its own green trace slice first,
  proving the renderer before adding droplets/blend/shake/hitsplat; (3)
  RAM-probe the 3008-3049/3064-3084 spans (dump-rockslide-sprites.py-style)
  to attribute sub-mechanism boundaries precisely, and confirm
  `gAnimMovePower` for ENDEAVOR (shake amplitude depends on it). Otherwise
  DRAGON_BREATH's window (3129+, slice E2) or ISSUES #19/#20.
- **Notes:** scope call made explicitly, not improvised — this run's own
  precedent (ROCK_SLIDE, §11) shows comparable per-mechanism complexity
  took a full session and still left a residual; five concurrent
  mechanisms here made a rushed pixel-fit likelier to land wrong or red
  than useful, so this session banked the (expensive, otherwise-repeated)
  research instead. No papercuts.

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

