# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 180 — Bounded worker: S7 slice L-2 (retry) — icon-bar re-trigger LANDED, tick-6727 transient RESOLVED (RAM-probed, not guessed); `turn5-sentout.json` (new) **141/141, 0 diff**, `npm test` **780/780** (+4), build green, zero regressions

- **State:** `npm test` 780/780, `npm run build` green, tree clean.
  `turn5-sentout.json` (icon-bar create/slide/settle/text/fade/destroy,
  tick 6588-6728) **141/141, 0 diff** (new). Full regression sweep at exact
  prior counts, all 0 diff: `turn5-faint` 110/110, `turn5-rockslide`
  256/256, `turn5-endeavor` 254/254, `turn5-menu` 41/41, `turn4-rockslide`
  250/250, `turn4-doubleteam` 249/249, `turn3-rockslide` 256/256, `turn1-
  rockslide` 256/256, `fight-submenu` 235/235, `turn3-endeavor` 192/192,
  `turn3-menu` 254/254, `turn2-endeavor-drain` 201/201, `turn4-menu`
  44/44, `turn2-dragonbreath` 237/237, `turn1-cloneanim` 230/230,
  `menu-idle` 69/69, `turn2-endeavor` 77/77, `s6-acceptance` 224/228,
  `scene-assembly` 256/256, plus `sendout.json` **255/256** (unchanged,
  pre-existing named residual).
- **Did:** per the supervisor's own explicit instruction, RAM-probed BOTH
  of #179's open unknowns BEFORE writing any render code (two new
  `ram-probe.py` specs, `switchin-iconbar-{slidein,transient}.json`, each
  run twice, byte-identical). Result: (1) the icon slide-in is NOT
  per-icon-staggered as #179 guessed - all 7 sprites (bar + 6 icons) share
  one IDENTICAL `x2` curve, bit-for-bit `OPP_BAR_X2` itself, zero stagger.
  (2) the tick-6727 "mystery transient" RESOLVED: at RAM 6725 all 7
  sprites' OAM `objMode` flips `NORMAL`->`BLEND` simultaneously (`x`/`y`/
  `x2`/`y2` unchanged - ruling out a position explanation), then all 7 are
  destroyed together at RAM 6742 - the same `Task_HidePartyStatusSummary`
  alpha-blend-then-destroy shape already modeled for the PLAYER bar's own
  S6-intro exit (`playerSummaryFadeEva`), just a flatter cadence here (1
  unit/tick, not "every other"). Implemented `drawTurn5IconBar` (reuses
  `OPP_BAR_X2`/`tableX2`/`drawBallStatusBar`/`blendedSetPixel` - zero new
  low-level drawing code) + the sent-out text hard-cut at the oracle-pinned
  absolute tick 6687. Landed BOTH the mandatory rung (a) and rung (b) in
  one commit (`turn5-sentout.json`, 6588-6728) since both were RAM-resolved
  before any code was written - stops one tick before the unimplemented
  ball prop's own first pixel (confirmed via a pixel-level diff that the
  gap is ball-shaped, not icon-bar-shaped: mismatched region isolated to
  x170-181/y58-69, the ball's own resting corner, ball-open-palette
  colors). Added 4 Tier-1 pins (icon-flip state, 3 for the tick-6727
  eva-ramp mechanism, 1 for the sent-out text timing). Docs: `docs/faint-
  switch-notes.md` §9 gained a "Resolution" subsection; new §25 in
  `docs/battle-turn-notes.md`.
- **Next:** the ball prop (fully spec'd, §8b: slot 7, static `(176,64)`,
  6727-6756) through Sitrus/settled-menu - all still pinned in docs, none
  reached this session (ran out of cap after landing the icon-bar
  mechanism cleanly). The two-anchor design (ball/tint/particles vs. the
  front-sprite stretch tables, 24 ticks apart) is unaffected by this
  session's findings and remains the right shape for that work.
- **Notes:** no new papercuts - the RAM-probe-first approach (both
  unknowns resolved before writing render code) avoided #179's own
  papercut (a large speculative draft reverted after burning most of the
  cap) entirely; worth keeping as the default order for future sessions
  chasing an undocumented pixel transient.

---
## 179 — Bounded worker: S7 slice L attempt (switch-in tail) — NOT LANDED, ran out of the 60-min cap mid-verification; speculative engine draft reverted (uncommitted); one real new blocker pinned precisely, `npm test` 776/776 + build unchanged (docs-only commit)

- **State:** tree unchanged from #178 except one docs-only addition
  (`docs/faint-switch-notes.md` §9). `npm test` **776/776**, `npm run build`
  green — identical to the pre-session baseline; no engine code shipped.
- **Did:** implemented a full draft of the switch-in tail (party-icon-bar
  re-trigger, "sent out PIDGEOTTO!" text, ball prop, materialize/stretch/
  particle-burst reuse, healthbox slide-in) in `src/engine/battleScene.ts`
  and iteratively verified it against the oracle via `npm run compare`
  (dense scratch traces, ticks 6580-6815). Two pieces came back **byte-
  exact**: the sent-out text (6687-6726, every tick 0 diff) and the icon-
  bar retrigger's own SETTLED state (6608-6726, 0 diff) — both safe for the
  next session to re-add verbatim. Found and pixel-verified a real
  correction to §3b's own guess: the flipped icon (GROVYLE's own former
  slot, index 5) renders as `"Statused"`, not `"Fainted"` (0/37 mismatched
  px, byte-exact). Found a genuinely NEW, previously-undocumented blocker:
  at render tick 6727 (exactly when the ball prop spawns), the icon-bar
  region changes AGAIN (a 16-tick alternating-magnitude transient, then a
  third distinct steady state) — not itemized anywhere in §3/§7/§8, and it
  conflates with the ball/materialize window in any compare run spanning
  both, so it blocks clean verification of everything from the ball prop
  onward. Ran out of the session's 60-minute cap before RAM-probing this
  directly (the fast path to resolve it) or reaching a clean 0-diff
  boundary anywhere past tick 6726. Per AGENTS.md ("keep the tree green at
  each commit," never ship a non-0-diff trace as done), reverted the
  speculative `battleScene.ts` draft rather than commit broken/unverified
  engine code — kept only the docs findings (real, oracle-verified,
  independent of the reverted code).
- **Next:** re-implement slice L starting from
  `docs/faint-switch-notes.md` §9's own findings (saves re-deriving the
  text/icon-settle mechanisms and the two-anchor materialize-timing
  hypothesis). RAM-probe the tick-6727 icon-bar interaction FIRST
  (`gSprites[]` for the 6 icon-bar sprites across render ticks 6720-6745,
  same `path`-based technique as `switchin-b1-sprite.json`) — it's the one
  new unknown gating everything downstream (ball/materialize/particles/
  healthbox-slide/Sitrus/settled-menu, all still unattempted).
- **Notes:** PAPERCUT: the switch-in window's timing turned out to need
  TWO independent anchor points (ball/tint/particles off one RAM tick,
  front-sprite materialize/stretch tables off a different one 24 ticks
  later) rather than the S6 intro's own single shared `handoffTick` — cost
  significant time to even suspect, since every existing precedent in this
  file (`drawSendOutHandoff`) assumes one shared anchor; worth flagging in
  the mapping table for whoever writes the eventual §9 follow-up. No other
  new papercuts.

---
## 178 — Worktree scout (supervisor-folded): slice L's five asset/formula gaps — 4/5 CLOSED with implementable numbers, 2 corrections to prior docs (the "thrown ball" is STATIC at (176,64), no arc exists; the particle burst is 16 sprites, not 13); merged `0f17f5c`, suite 776/776 on the merged tree

- **State:** merged into master, `npm test` 776/776 + build green
  post-merge (supervisor-verified). New: `docs/faint-switch-notes.md`
  §8, `tools/extract/extract-battle-anim-item-heal.ts` +
  `src/assets/gen/battle-anim-item-heal.json`, probe specs + twice-run
  outputs. No engine changes.
- **Did:** (gap 2) ball prop: slot 7, created 6727, static (176,64),
  lifetime 6727-6756, reuses extracted ball-open gfx — no arc, no new
  asset. (gap 3) materialize tint: bit-for-bit the same
  `MATERIALIZE_TINT_COLOR` + 15-tick ramp as Grovyle's send-out,
  re-anchored (hold 24, ramp 15). (gap 4) particle burst x2/y2 verified
  400/400 exact vs the ALREADY-IMPLEMENTED gbaSin/gbaCos formula; count
  corrected 13→16 (3 reused freed slots the earlier scan missed).
  (gap 5) healthbox slide-in: same sprite slot throughout; old box goes
  invisible in lockstep with the sink destroy tick (no slide-out);
  new box = the identical 23-step linear slide-in from send-out.
  (gap 1) Sitrus sparkle extracted BYTE-EXACT (0/115px); ring extracted
  + source-cited but NOT pixel-verified — which affine-anim table
  (`cmds1`/`cmds2`) applies is the one remaining unknown (§8a), a 2-way
  choice slice L can settle by direct oracle diff.
- **Next:** slice L (the switch-in window, tick 6588 → settled menu vs
  PIDGEOTTO ~7256) has every formula/asset it needs; the ring affine
  choice is its only in-flight unknown.
- **Notes:** no new papercuts (known ram-probe bitfield gap worked
  around as documented).

