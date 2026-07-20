# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 140 — Bounded worker: S7 slice E1d — ENDEAVOR squish wired + oracle-fitted, X-axis MISFITS — reverted, nothing landed; suite unchanged **669/669** (`docs/battle-menu-notes.md` §15a FITTED addendum has the full empirical writeup)

- **State:** `npm test` **669/669** (unchanged), `npm run build` green,
  tree clean, no trace changes. Engine code was written and tested this
  session but **reverted** (`git checkout`) once it was clear it only
  half-fit — this run's own "never commit red" rule, not a scope call.
- **Did:** confirmed `drawSpriteSheetAffineStretch` (already in
  `battleScene.ts`, built for GROVYLE_STRETCH) is the renderer §15 asked
  for — no new primitive needed, just pre-invert the accumulator
  (`0x10000/acc`) before calling it, since squish is table-driven
  (`AFFINEANIMCMD_FRAME`/real `ObjAffineSet`, same family as materialize)
  unlike GROVYLE_STRETCH's own bespoke direct-write function. Ran a fresh
  dense oracle probe (`turn2-endeavor-drain.json`'s own prefix, captures
  2996-3012) that sharpened §15's bbox table to the exact tick: 2999
  neutral, 3000 first visible, 3006 widest, 3008 target-side contamination
  starts — pins `ENDEAVOR_SQUISH_START_DELAY=54`. Fitting against that
  data found the **Y axis matches the oracle exactly** (`dxScale`'s own
  accumulator maps to rendered Y, not X — a real axis-label correction)
  but the **X axis doesn't**: oracle wants a 76px-wide silhouette (12px
  past the 64px neutral canvas), the fitted renderer only reaches 63px —
  a whole-silhouette misalignment, not an edge residual. Tried both
  remaining axis-mapping directions and an `ST_OAM_AFFINE_DOUBLE`-style
  doubled destination box (added as a backward-compatible opt-in param,
  since reverted with everything else) — neither closed the gap.
- **Next:** RAM-probe `gSprites[]`'s own affine data fields for X directly
  (same `dump-rockslide-sprites.py`/`sendout-grovyle-stretch.json`
  precedent this run already has) rather than continuing to pixel-fit
  blind — recommended over more guessing, per §15a's own "open questions"
  list (possible causes: a transcription error in the extracted step
  table, or a concurrent mechanism, e.g. the blend task, already
  contributing pixels earlier than assumed). Once X fits, land exactly
  per the original brief's staged order (squish sub-window 3000-3007 →
  droplets → blend → shake → hitsplat).
- **Notes:** no papercuts. Time-boxed session spent its remaining room on
  pixel-fit attempts rather than switching to a RAM probe soon enough —
  flagged in §15a so the next session doesn't repeat the same dead ends.

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

