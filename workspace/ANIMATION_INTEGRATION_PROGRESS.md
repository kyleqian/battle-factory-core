# Animation integration progress

## 2026-10-05 — prep8 batch folded: 191 live adapters; uncovered-unit evidence

- Folded worker `6598eb715` as `4c7791984` (src `4bf17bef1`): Swift, Trick,
  Frustration (friendship ≤ 30), Seismic Toss (damage 33..65), Horn Drill,
  Aurora Beam, Uproar, Thunderbolt, Stockpile, Zap Cannon — allocator constants
  + lent order, gated on the tracked order being known. Supervisor dense 24
  fixtures twice fresh, 4,013 rows/run, zero residual; routes 10/10 PASS.
  Receipt `prep8-supervisor-receipt.json`. New ISSUES #143 (CASTFORM art).
- Uncovered units (`80a12ace4`, `docs/sprite-order-uncovered-units.md`): faint,
  summary, send-out, switch-in, party menu, reshow, recall and trainer-slide
  order transforms 36/36 exact (strict route edges known rise accordingly), but
  after a KO the battler slots and the affine baseline change, so lends stay
  gated (needs occupancy-aware consumers + post-unit affine/task baselines).
- Running: final batch (Giga Drain, Sunny Day, Mega Drain, Absorb, Dream
  Eater, Double Team player, Feather Dance).

## 2026-10-05 — prep7 batch folded: 181 live adapters

- Folded worker `81929ce83` as `d244f2f79` (src `907516e6b`): Aerial Ace,
  Quick Attack (live age 0 = activation, reducer age + 42 / 44), Ice Punch,
  Fake Tears, Sleep Talk, Fire Blast, Dragon Dance (lent order), Rock Slide
  (opponent attacker only). Supervisor dense 19 fixtures twice fresh, 2,367
  rows/run, zero residual; routes 8/8 PASS. Receipt `prep7-supervisor-receipt.json`.
- Limit: Aerial Ace with CHARIZARD/DRAGONAIR opponent attackers leaves 14/51 px
  at ages 10-11 on the opponent platform clip row.
- REL-Y-STATIC confirmation (`259c1a694`, `docs/sprite-order-rely-confirmation.md`;
  supervisor regenerated the 83-row file identically): 60 candidate bodies
  confirmed order-static across ≥2 geometries (+23 absolute-invariant), 30
  refuted; weighted EXACT plan coverage 68.2% → 80.6% (83.7% with all rows);
  union replay 2,158/2,158 exact. Rows are not yet in the production table.
- Running: prep8 batch (ten allocator-plan-v2 moves); uncovered units
  (faint / send-out / switch / party menu) order evidence (side).

## 2026-10-05 — prep6 batch folded: 173 live adapters; prep8 prep

- Folded worker `776478118` as `91e78cb74` (src `5a9ef5cdf`): Rock Tomb,
  Safeguard, Sweet Scent (reducer age = live − 4), Self-Destruct, Swallow
  (stockpile = request.turn), Knock Off (ageOffset −11), Faint Attack (player
  attacker only). Supervisor dense 20 fixtures twice fresh, 2,771 rows/run,
  zero residual; routes 8/8 PASS. Receipt `prep6-supervisor-receipt.json`.
- Limit to resolve: Faint Attack's last 16 ages (fade back from the dark
  background) differ by one script frame between BattleLab-context renders
  and the accepted staged probe; the adapter matches the staged probe.
- prep8 measured prep (`a6d0bb7d8`, `docs/next-adapters-prep8.md`): Swift,
  Trick, Thunderbolt, Frustration, Horn Drill, Seismic Toss, Aurora Beam,
  Stockpile, Uproar, Zap Cannon all READY (allocator literals = ROM plan;
  order pixel-neutral except Zap Cannon ≤4/117 frames); gate on the lent
  order (`spriteOrderInput.known`), no new provider module needed.
- Order policy gaps (`e82018fd9`, `docs/sprite-order-policy-gaps.md`): the
  prep7 "stat command invalidates" finding is stale (the cross-body host maps
  `stat-stage-change` to a no-op; Double Team/Feather Dance first bodies now get
  a known order 3/3); Intimidate entry seed (pre-prompt state + stat plan)
  reproduces the ROM 12/12; Endeavor and Fake Tears are order-static under a
  constant relative-y spread (strict real-route known edges 15 → 44, 0
  mismatches). Production change proposal §1 (A-C) not yet applied.
- prep9 (`69f218f0a`, `docs/next-adapters-prep9.md`; supervisor regenerated the
  palette baseline identically): Absorb, Mega Drain, Giga Drain, Dream Eater,
  Sunny Day need NO palette snapshots (census D-PAL stale): BG banks constant at
  53/53 activations, OBJ banks = species art; allocator profiles constant;
  order pixel-neutral. All READY (four with the lent order).
- Running: prep7 batch (integration); REL-Y-STATIC confirmation for 121
  candidate bodies (side).

## 2026-10-05 — cross-body sprite-order tracking live

- Folded Opus worker `a7753047a` (code `35c7f902f`) as `27ae6f331`: event-driven
  order host (`src/engine/liveSpriteOrderHost.ts`), pure presentation-event
  transform, generated production table (381 EXACT bodies, 16.6 kB; +6 kB
  gzip bundle). Order consumers (Grudge, Heal Bell, Leaf Blade, Rock Throw,
  Blaze Kick, Perish Song) now render whenever the tracked order is known.
- Evidence: TS corpus 1,044/1,044 exact; real-route strict 3/3 per trace (stops
  at the unplanned Endeavor body); host == pure transform on 200 seeds (239
  later bodies known, 0 mismatches). Supervisor: five later-body routes (both
  sides) PASS, new tests green. Receipt `order-cross-body-supervisor-receipt.json`.
- Limits: later-body pixels rest on the order claim + first-body dense proofs;
  Intimidate entries, locked continuations, party-menu returns, hidden targets
  invalidate.
- prep7 measured prep (`ae18c3644`, `docs/next-adapters-prep7.md`): READY Aerial
  Ace, Quick Attack, Ice Punch, Fake Tears, Sleep Talk, Rock Slide (opponent);
  Fire Blast, Dragon Dance via the provider; Feather Dance / Double Team need
  the order kept across their leading `stat` command.
- Allocator plan v2 evidence (`d97eed5db`, `docs/allocator-plan-v2-evidence.md`;
  supervisor fresh Swift probe identical, analysis regenerated identically):
  affine matrix bitmap 0x6 and no active task at all 481 body activations
  (195 scenarios + the Factory route); 467/467 closed bodies return to that
  baseline; 12 move timelines reproduce the accepted matrix ids / task slots
  (0 differing ages). Swift, Trick ready; Thunderbolt, Frustration, Horn Drill,
  Seismic Toss, Aurora Beam, Stockpile, Uproar, Zap Cannon also need the order;
  Rock Blast / Razor Wind need outcome input. Faint/send-out/switch baselines
  unprobed.
- Running: prep6 batch (integration); prep8 measured prep for the v2 moves (side).

## 2026-10-04 (night) — order-consumer batch folded: 166 live adapters

- Folded worker `bd04c68bd` as `72610e111` (src `53130b776`): Ember, Dragon
  Rage (no order input), Flamethrower (provider seed or ascending, both exact)
  render always; Heal Bell, Leaf Blade (new `initialOrder` parameters, staged
  defaults unchanged), Rock Throw (occupied prefix + F), Blaze Kick, Perish
  Song (creation rank, 3/3 turns) render as the battle's first body only.
  Harness replays fixture `precedingBodies` with the plan applier (16/16 equal
  the validated seeds).
- Supervisor dense: 16 fixtures + Ember/Flamethrower HOUNDOUR both sides
  twice fresh, 2,874 rows/run, zero residual; routes 8/8 exact ON/OFF parity.
  Receipt `order-consumers-supervisor-receipt.json`.
- Limits: Blaze Kick has no first-body ROM scenario (proof uses its
  Torment-preceded accepted history); tails Flamethrower 80 / Dragon Rage 21 /
  Blaze Kick 9 / Ember 3 frames uncovered.
- Plan coverage (`adc8d04f3`, `docs/sprite-order-plan-coverage.md`): 228 more
  scenarios (two identical runs each) raise EXACT body plans to 68% of
  weighted Factory move uses (was 52%); union replay 1,053/1,053 exact.
- Remaining-adapters census (`2add7576e`, `docs/remaining-adapters-census.md`,
  regenerate `node tools/integration/remainingAdaptersCensus.mjs --write --doc`):
  276 = 158 live + 15 in flight + 103 remaining (READY-NOW 10, SMALL-INPUT 5,
  single provider 31, multi 56). Provider ranking: allocator plan v2
  (affine matrix + task slots) +12 moves; Random2 surrogate +7 (non-exact,
  claim-boundary question); graphics host +6; palette snapshots +5.
- Running: cross-body order tracking (Opus); prep7 measured prep for the
  census READY-NOW batch (side).

## 2026-10-04 (night) — sprite-order provider wired (first body) + Grudge: 158

- Folded Opus worker `3bb021abb` (code `f279df7cc`, src `953b81b0a`) as
  `0d212ae24`: provider API (`spriteOrderForSlots`, occupied prefix, body/gap
  plan applier — TS replay 659/659, equal to Python; tests/harness only),
  presentation-only order state beside the allocator host. Production supplies
  a known order only to the battle's FIRST move body after a known entry with
  no battle-start script events; invalidated by any other preceding command,
  unknown graphics, switch-in, party menu, and after that body.
- Grudge (288) live as the first order consumer (first body only; null →
  bounded fallback otherwise). Supervisor dense 2 fixtures twice fresh, 418
  rows/run, zero residual; route 288@57,3,0 PASS; seed 16 (opponent's Light
  Screen first) falls back 0/209 with ON/OFF parity. Receipt
  `order-wiring-supervisor-receipt.json`.
- Running: order-consumer batch (Ember, Dragon Rage, Flamethrower always-on;
  Heal Bell, Leaf Blade, Rock Throw, Blaze Kick, Perish Song first body).
  Next: cross-body order tracking keyed on prompt / body / hit-animation /
  stat events (`docs/sprite-order-gap-causes.md` §2).
- prep6 measured prep (`9215f385e`, `docs/next-adapters-prep6.md`; supervisor
  reproduced pins/slots): READY Rock Tomb, Safeguard, Sweet Scent,
  Self-Destruct, Knock Off (age basis −6), Swallow (stockpile = request.turn),
  Faint Attack (player attacker only); Pain Split needs per-side coords
  yOffset in its reducer; Dragon Dance (1 frame), Fire Blast and Double Team
  need the order provider.
- Real-route order validation (`2ad3cb4e9`, `docs/sprite-order-real-route.md`;
  supervisor fresh rerun identical): five canonical Factory battle-1 traces,
  ROM per-frame order. Event rules (prompt bounce pair, hit-animation blip,
  stat ±1/±2) 121/121 unit checks exact; with resync after each unknown unit
  all 91 move edges exact. Strict tracking stops at the first body without a
  plan (the opponent's Double Team on turn 1): table coverage is the limit.
  Faint, next-mon summary/send-out, forced switch-in, party menu, battle
  reshow and the end-of-battle slide must invalidate.

## 2026-10-04 (night) — prep5 folded: 157 live adapters; order-consumer prep

- Folded worker `ce8d7a09e` as `c23e165bb` (src tree `1f73449b5`): Mist Ball
  (ad-hoc shadow retired; Registeel drafts fixed to genderless), Aromatherapy
  (duration 400 player / 396 opponent attacker, same script-end frame), Follow
  Me, Metronome (body only; called move is an ordinary second request), Taunt
  (age 0 = window start, 10 frames after activation), Belly Drum. No palette plans.
- Supervisor dense: 12 fixtures + Follow Me CLEFABLE/FURRET, Taunt MIGHTYENA,
  Metronome CLEFABLE (`altSpecies8.py`) twice fresh, 2,938 rows/run, zero
  residual. Routes 6/6 exact ON/OFF parity; Mist Ball prep seed 90 has no body
  because Latias flinched (checked). Union typecheck/smoke/affected green.
  Receipt `prep5-supervisor-receipt.json`.
- Order-consumer measured prep (`66a349c26`, `docs/order-consumer-prep.md`):
  18/18 accepted order literals equal the provider. Ember and Dragon Rage need
  no order input (one sprite per sort window); Flamethrower's seed is
  pixel-neutral; Rock Throw, Heal Bell, Leaf Blade, Perish Song, Blaze Kick,
  Grudge (first body), Mud Slap, Sand Attack need the provider; consumers need
  `F` filtered to their allocation slots, not `F.slice(0, n)`. Dive attack body
  needs live keys; Magnitude's own evidence is not accepted.
- Running: provider wiring step (first body of a battle + Grudge consumer,
  Opus worker).
- Gap causes (`e26052db2`, `docs/sprite-order-gap-causes.md`): the
  between-body one-sprite blip is the target hit animation's healthbox jiggle
  (`DoHitAnimHealthboxEffect`, 20 frames; 170/170 corpus blips = its calls;
  absent on miss/no-effect/heal/charge turns; supervisor fresh probe of
  Tackle-vs-Ghost reproduced, two runs identical) → key on the engine's
  `hit-animation` command with a visible target. The prompt pair is the
  action-prompt bounce pair (create two lowest-free at the prompt, destroy at
  commit; move-menu cancel/cursor no-op; party menu → invalidate). Intimidate
  entries run `B_ANIM_STATS_CHANGE` (`C[f]; D[n0]`) before the first prompt
  (12/12 replay exact). Confusion/Hail/trap end-turn animations need keys.

## 2026-10-04 (night) — H_BUFFER S1 folded: 151 live adapters

- Folded worker `8c5c734a9` as `5fd7ea33b` (src tree `c449f3775`): Mean Look,
  Smelling Salt (ad-hoc shadow retired), Defense Curl (animationCenter =
  battlePositionCenter + (0,6)), Ingrain, Wrap, Bind (shadow row +2, the first
  non-zero row; shared hook needs no change), Dragon Breath (ageOffset −2,
  85 rows, duration 83). Bind/Dragon Breath attackers are drawn without the
  front idle rest offset (ROM-exact on ONIX, rest x2=1). No palette plans.
- Supervisor dense: 14 fixtures + Ingrain/LILEEP, Mean Look/SABLEYE, Defense
  Curl/SANDSHREW (windows = alt activation + accepted offset, `altSpecies7.py`)
  twice fresh, 1,883 rows/run, zero residual. Routes 7/7 exact ON/OFF parity
  (Bind/Wrap prep seeds missed; re-picked hitting seeds, same carriers).
  Receipt `hbuffer-s1-supervisor-receipt.json`.
- Limits: Bind/Wrap end-of-turn trap animation (separate status body) not
  covered; Smelling Salt/Wrap/Bind/Dragon Breath proven on accepted species only.

## 2026-10-04 (night) — free-slot sprite-order provider: module + evidence

- `src/engine/spriteOrderProvider.ts` (design §4 slice 1, `4304d0fb5`): pure
  frozen `SpriteOrderState`; TS corpus replay 80,370/0 frames (2×40,185) and
  112/112 activation heads; `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` checked in all
  44 raw files; `knownEntrySpriteOrderState` replays the 78 entry sort windows.
  Not wired into any adapter yet.
- Ordinary Factory entry ROM-confirmed (`0ead026e7`,
  `docs/sprite-order-factory-entry.md`): canonical draft → battle 1
  (`traces-groundtruth/battle1-turn1.json`) plus an RNG-shifted variant (other
  opponent lead and first move), two byte-identical runs each (supervisor fresh
  rerun identical): same 78 windows, same first-action free order, allocator
  `ordinary-factory` occupants confirmed. Different player rentals and battle 2+
  are not covered.
- Body/gap order plans (`dc7cf6445`, `docs/sprite-order-body-plans.md`,
  reproduce `python3 tools/integration/spriteOrderBodyPlans.py --write`,
  supervisor rerun unchanged): 350 scenarios; live cells 216 EXACT-PLAN / 59
  NEEDS-KEYS / 13 not observed; 107 live ids exact both sides. Plan-only replay
  from the known entry: 659/659 edges exact (321 later actions). Ember,
  Flamethrower, Rock Throw, Dragon Rage, Shadow Punch bodies are EXACT; Blaze
  Kick, Mud Slap, Sand Attack, Grudge, Dive, Heal Bell, Perish Song, Leaf Blade
  bodies need live keys (usable as targets only). Battles with an entry ability
  animation (12 scenarios) start from a different order and must invalidate.
- Next: order-consumer measured prep (side lane), then the integration wiring
  step (provider in the live host + body/gap tables + first consumer).

## 2026-10-04 (evening 2) — prep2 batch folded: 144 live adapters

- Folded worker `773aca6f7` (tested code `ee469399c`, src tree `702752ac5`):
  Surf + Muddy Water (one branch), Icy Wind, Blizzard (anchor-derived
  effectGeometry), Fake Out (new `liveBattlerCoordAttrs`), Cosmic Power,
  Future Sight (turn-1 body), Explosion (displayed HP already 0). Shadow rows
  0 except Future Sight/Explosion (not in map); Blizzard and Cosmic Power
  ad-hoc shadows retired. No palette plans.
- Supervisor dense: 16 fixtures + Surf/SEALEO and Icy Wind/POLIWHIRL
  alternate species twice fresh, 3,620 rows/run, zero residual. Routes 7/7
  exact ON/OFF parity; Explosion route (worker) ends at the forced-replacement
  screen via new `allowStall` in generatedCommandAnimationReplay. Receipt
  `prep2-supervisor-receipt.json`.
- Limit: Icy Wind/Blizzard return the scene-off view when the reducer's
  retained particle slot table cannot verify the live geometry
  (`provableEffectOrder`); Blizzard live for ~90% of player-attacker and ~34%
  of opponent-attacker species pairs. Lifting it needs a reducer change.

## 2026-10-04 (evening 2) — H_BUFFER triage + measured prep (evidence only)

- `docs/h-buffer-triage.md` (static, 84 moves): 14 ready-now, order provider
  alone +5 (19 with ready), order+affine 27. Measured follow-up
  `docs/h-buffer-s1-prep.md` (176 production pins vs accepted): Dragon
  Breath, Defense Curl (animationCenter = battlePositionCenter + (0,6)),
  Ingrain (accepted species Cacturne), Mean Look, Smelling Salt, Bind (shadow
  row +2), Wrap READY with drafted `prep4-*` fixtures and routes; EMBER needs
  the sprite-order provider (117 equal-key pairs, 90 overlapping).
- `docs/next-adapters-prep5.md` (132 pins): Mist Ball, Aromatherapy (400/396
  by side), Follow Me, Metronome, Taunt, Belly Drum READY with `prep5-*`
  fixtures/routes; Heal Bell, Perish Song, Leaf Blade, Dragon Rage need the
  order provider. Metronome's called move is an ordinary second request.
- Next integration batch brief (not dispatched; user asked to wind down):
  Mean Look, Smelling Salt, Defense Curl, Ingrain (+LILEEP alt species),
  Wrap, Bind, Dragon Breath from `prep4-*`; then the six prep5 READY moves.

## 2026-10-04 (evening 2) — next5 folded: 136 live adapters

- Folded worker `172b4024b` as `4818dc692` (src tree `8a0b13c30`): Scary Face,
  Glare (eye points from `liveBattlerAnchors` + pic-coords height), Teeter Dance,
  Dizzy Punch (attacker personality threaded as presentation-only
  `BattleCommandFieldBattler.personality`, also on the battle-start field),
  Soft-Boiled (self-target; new optional `SceneOnSoftBoiledConfig.bystander`
  draws the displayed other-side battler instead of hard-coded Onix).
  Shadow rows 0 for Glare/Teeter Dance/Soft-Boiled; Scary Face (-4) and Dizzy
  Punch (-13) not in map. No palette plans (history invalidates).
- Supervisor dense: 10 fixtures + alt-species Scary Face/ARBOK and
  Glare/SEVIPER (source-derived windows, `altSpecies5.py`) twice fresh,
  2,229 rows/run, zero residual. Routes 4/4 exact ON/OFF parity (Scary Face
  14/[3]/0, Glare 1/[1]/7, Teeter Dance 49/[1]/0 and Dizzy Punch 49/[0]/0 with
  a player SPINDA). Soft-Boiled has no generated-rental carrier (dense only).
  Receipt `next5-supervisor-receipt.json`.
- Limits: Scary Face (14 frames) and Dizzy Punch (5) script tails beyond the
  accepted window are not covered; Soft-Boiled proven for Chansey only;
  a Transform-into-Spinda attacker would need `gTransformedPersonalities`
  (Transform histories already invalidate).
- Worker full suite had one failure (`battleCommandPresentation.test.ts`
  expected projection lacked `personality`); fixed test-only.

## 2026-10-04 (evening 2) — prep2 triage banked (evidence only)

- Side-lane `0b2044ec7` folded as `3699eb6ac` (new files only):
  `docs/next-adapters-prep2.md` triages the 33 unadapted H_BASIC/H_DERIVED
  moves: READY 11, small-input 12, blocked 10 (switch flow Baton Pass/Roar/
  Whirlwind; Sleep Talk called move; Substitute doll; Memento scanline; Spark
  order; Wish/Meteor Mash Random2; Extreme Speed age basis). Drafted
  `prep2-*` fixtures for the next batch (Surf, Muddy Water, Icy Wind,
  Blizzard, Fake Out, Explosion, Cosmic Power, Future Sight); activation
  receipt `docs/next-adapters-prep2-activation.json`. Supervisor re-measured
  Surf activation 72..215 fresh (matches).

## 2026-10-04 — next-adapters prep banked (evidence only)

- Side-lane prep `72ff8df29` folded (new files only): `docs/next-adapters-prep.md`
  and ten drafted fixtures `tools/integration/fixtures/next-*.json` for Dizzy
  Punch, Teeter Dance, Soft-Boiled, Scary Face, Glare (windows, activation,
  #142 shadow rows: Teeter Dance/Soft-Boiled/Glare 0; Dizzy Punch -13 and Scary
  Face -4 = no shadow). Inputs: personality must be threaded from
  `BattleScriptRulesBattlerState.personality` (only Spinda pixels depend on
  it); Soft-Boiled renderer hard-codes Onix and needs self-target support in
  the harness; eye centers derive from anchors + pic height for any species.
  Not yet framebuffer-verified.

## 2026-10-04 — visual-randomness prep banked (evidence only)

- Side-lane prep `d4356b7a1` folded (new files only):
  `docs/visual-randomness-prep.md`. Astonish, Double Kick, Thrash, Flail,
  Luster Purge, Mud Slap and Sand Attack draw only `Random2()` (gRng2Value;
  never gameplay RNG — Scene ON/OFF cannot desync gameplay); Dizzy Punch and
  Teeter Dance need only the attacker personality (exact now). gRng2Value's
  per-frame advance during Double Kick is empirical (caller not found) — open.
- Recommended next: Dizzy Punch + Teeter Dance (personality), Flail (power +
  2 words), then a presentation-only Random2 helper for the rest.

## 2026-10-04 — session wind-down: anchor4 folded, 131 live adapters

- Folded anchor4 `17e7a98f9` as `d935baca4` (src tree `3dc209a36`):
  Earthquake, Fissure, Crabhammer, Magical Leaf, Psybeam, Amnesia (idle x2 /
  picture size from live species; shadow rows 0; shifted-X static BG now fires
  the shared #142 hook). Supervisor dense 12 fixtures twice fresh, 2,228
  rows/run, zero residual; routes 6/6; scan 281 rows / 131 ids, 0 mismatches.
- Final production `d935baca4`: adapters 131, accepted 276, remaining 145.
  Supervisor final full 1,493 files / 11,963 tests, build 847
  (`final-supervisor-gates-20261004.json`). Preview serves `d935baca4`; four
  exact canvas/PNG hashes, export, ON->OFF restart, no errors.
- Next (resume points, all with banked evidence): sprite-order provider
  slices (`docs/sprite-order-provider-design.md`); status-animation occupancy
  persistence; Reversal reducer change (needs the animation program);
  Soft-Boiled; Scary Face/Glare eye anchors; H_BUFFER/H_RANDOM/H_OUTCOME
  groups. No arbitrary-history framebuffer claim.

## 2026-10-04 — multi-hit per-hit adapters (125 live)

- Folded worker `ed4095683` (tested code `fb5b811f6`, src tree `c14cdb45a`):
  Double Slap, Comet Punch, Triple Kick, one body per hit with moveTurn from
  request.turn; staged-only draw cases ported to the live field; shadow row 0
  per hit. Adapters 125, remaining 151.
- Supervisor dense: all 21 per-hit fixtures twice fresh, 759 rows/run, zero
  residual. Routes: Double Slap 4 and 3 hits, Comet Punch 3 hits; Triple Kick
  has no generated-rental carrier (dense only). Comet Punch's target anchor
  was found by a y sweep then tied to the reducer's own opponent offset;
  accepted on the exact ROM proof. Receipt `multihit-supervisor-receipt.json`.

## 2026-10-04 — ISSUES #142 fixed: elevated-opponent shadow + Sandstorm idle

- Folded worker `39675dec0` as `5cbc09758` (tested code `68ff5b22e`, src tree
  `399bfc94a`): `liveMoveOpponentShadowRow` names the live row for the 88 ids
  whose accepted window starts at script activation; the live view arms one
  shadow draw consumed by the battle-background paths (behind battlers and
  effects); ad-hoc age-0 draws removed (Hyper Fang, Swagger, Bulk Up no longer
  draw it); Sandstorm's live opponent keeps its idle rest offset. Staged output
  unchanged. ISSUES #142 deleted.
- Supervisor: row scan rerun 248 rows / 122 ids, 0 mismatches; dense 14
  alternate-species/elevated fixtures twice fresh, zero residual (five 200-px
  row-0 cases and Sandstorm/Onix 180,304 px now exact; controls stay exact).
  Supersonic fixtures unverifiable: its probe wrapper fails on master too.
- Gates: supervisor focused 140 + smoke 448; worker full 1,491 files /
  11,933 tests, build, typecheck reused. Receipt
  `issue142-fix-supervisor-receipt.json`.

## 2026-10-04 — Reversal shake evidence banked

- Side-lane evidence `8fbf3a7ab` folded (new files only):
  `docs/reversal-shake-evidence.md`, receipt
  `tools/integration/fixtures/reversal-shake-evidence.json`. Power 20/40/80/
  100/150/200, both sides, twice fresh: x2 = +ceil(A/2), -floor(A/2) toggling
  every 2 frames (7 visible toggles), A = clamp(gAnimMovePower/12, 1, 16) from
  the dynamic HP power; accepted reducer `reversal.ts` (A/0) exact only at A=1.
- Resume: change the reducer's toggle, add A>1 tests from this receipt, then
  wire Reversal live with amplitude from request.power. Caveat: HP was lowered
  by Super Fang from a non-learner (Chansey); the shake depends only on power.

## 2026-10-04 — multi-hit adapter prep banked

- Side-lane prep `797174269` folded (new files only): `docs/multihit-prep.md`,
  per-hit evidence and 21 drafted fixtures
  `tools/integration/fixtures/multihit-<move>-<side>-hit<i>.json` for Double
  Slap (34 rows/hit), Comet Punch (37), Triple Kick (37), both sides; each hit
  window starts at its own activation; request.turn = hit index; hits >= 1
  show a blank message box; target x2 0 after hit 0.
- Resume: port the three staged-only draw cases (battleScene.ts Comet Punch,
  Double Slap, Triple Kick) to liveField like Fury Swipes, wire moveTurn from
  request.turn, run the drafted fixtures. Not yet framebuffer-verified.

## 2026-10-04 — selectors batch: four request-selector adapters (122 live)

- Folded worker `e6d6c056f` (tested code `786a17110`, src tree `379f96d40`):
  Solar Beam (turn bit 0), Present (damage > 0), Moonlight (healing anchor),
  Whirlpool main body. Adapters 122, remaining 154. Harness gained
  requestFields/denseSegments/messageLines.
- Dropped with blockers: Reversal (source shake +ceil/-floor of
  clamp(power/12) vs accepted reducer A/0), Soft-Boiled (hard-coded Onix
  corners), Double Slap/Comet Punch/Triple Kick (request.turn maps; per-hit
  dense windows not built).
- Supervisor dense: twelve fixtures + three older regression fixtures through
  the new harness, twice fresh, 2,737 rows/run, zero residual; routes 4/4 incl.
  both Solar Beam bodies and both Present branches. Worker full 1,490 files /
  11,900 tests reused. Receipt `selectors-supervisor-receipt.json`.

## 2026-10-04 — #142 per-move shadow-row table banked

- Side-lane evidence `9de65cf17` folded (new files only):
  `tools/integration/fixtures/issue142-shadow-rows.json`, doc
  `docs/issue142-shadow-rows.md`, resolver/probe scripts. 236 rows (118 live
  ids x 2 orientations) from accepted window starts vs probed/audited
  activation frames; every in-window row is live row 0.
- needsFix 70 ids (128 rows); wronglyDrawn 3 ids (Hyper Fang, Swagger, Bulk
  Up draw the shadow although their windows start 4/7/4 frames after
  activation); alreadyCorrect 26; notInWindow 34. Cross-checks 15/15 against
  the source-derived alternate-species proofs; supervisor spot-check of Body
  Slam (offset 0) and Toxic/Swagger (+7) agrees.
- The #142 fix step implements this table (queued after the selectors batch).

## 2026-10-04 — altspecies3: source-derived windows refine #142

- Side-lane evidence `4e720e41b` folded as `d2530865a` (new files only): all
  16 alternate-species cases re-derived from the source activation frame,
  twice fresh. Five reliable #142 fixtures (200 px at row 0): Body Slam,
  Mega Punch, Reflect, Brick Break (shattered wall), Night Shade; eleven exact
  controls. Brick Break/Haunter and Night Shade/Golbat residuals were staging
  artifacts (missing body selector; HP digits). Tail variance of 1 frame in
  `Task_FadeToBg` (Night Shade, Shadow Ball) is ROM behaviour not yet modelled.
- Refinement: the shadow belongs to the activation frame; only moves whose
  accepted window starts at activation (offset 0) need it on row 0. ISSUES
  #142 and the fix brief updated to a per-move offset rule.

## 2026-10-04 — altspecies2 BEFORE set (partial) for #142

- Side-lane evidence `79719cc3b` folded as `8429e7b24` (new files only): 16
  alternate-species cases on older adapters, twice fresh. Reliable #142
  acceptance: Body Slam/Golbat and Mega Punch/Magneton (200 px at age 0),
  Brick Break/Haunter row 0. Window starts for the rest came from a biased
  live-match finder; two unattributed residual families (Brick Break vs
  Haunter ages 23-191 ~2,587 px/row; Night Shade vs Golbat 59 px/row).
- Follow-up running (side lane): re-derive starts from the source activation
  frame and attribute both families.

## 2026-10-04 — anchor3 batch (118 live), net-zero list 110, #142 scoped

- Folded anchor3 `02d753d84` as `6faa70568` (src tree `dabce926b`): Endure,
  Focus Energy, Facade, Minimize, Thunder, Thunder Wave, Swagger, Bulk Up
  (fields mapped from `liveBattlerAnchors`; row-0 shadow and opponent idle
  applied in these branches). Rung 0 widened the audited net-zero list to all
  110 then-live ids: Light Screen now exact after Bubble Beam/Acid, Mirror Coat
  after Bubble Beam. Adapters 118, remaining 158.
- Supervisor: dense 16 fixtures twice fresh, 2,250 rows/run, zero residual;
  routes 8/8 and eligibility 5/5. Worker full gate had one expected route
  failure (fixed test-only), so the supervisor ran a fresh full suite and build
  on `6faa70568`: 1,489 files / 11,884 tests passed, build 847 modules.
  Receipt `anchor3-supervisor-receipt.json`.
- #142 scope scan folded (`760b0cb04`): 101/110 live ids miss the elevated
  row-0 shadow as target, 89 as attacker; draw order says insert right after
  the battle background. Fix step queued after the selectors batch.

## 2026-10-04 — alternate-species dense proofs confirm ISSUES #142

- Side-lane evidence `6a018f986` folded (new files only): twelve alternate-
  species cases (elevated Golbat/Magneton/Haunter/Koffing/Jumpluff opponents;
  Onix/Rattata opponent attackers), each twice fresh with identical source
  digests. Receipt `altspecies-live-evidence.json`; doc
  `docs/altspecies-live-evidence.md`.
- CONFIRMED: elevated-opponent shadow missing on row 0 (200 px) for Mud Shot,
  Flame Wheel, Heat Wave, Block, Torment, Detect; Sandstorm opponent-attacker
  Onix idle x2 missing. Acid, Synthesis, Hyper Fang/Rattata correct. Filed
  as ISSUES #142 with fix shape and acceptance; fix step queued.

## 2026-10-04 — allocator history persists across audited net-zero bodies

- Folded worker `da5965fc2` (src tree `8566da639`): 90 audited net-zero live
  ids without a plan now leave a known sprite-allocator host unchanged, so
  Light Screen and the wall family use their exact adapters after audited
  bodies, not only as the first body. Licensed by the net-zero audit plus the
  consumer tie audit (six consumers only). Palette history unchanged; status,
  switch and summary still invalidate.
- Supervisor eligibility routes 17/17: adapter after Crunch+Rest (Protect),
  Spite and Screech (Light Screen); fallback after unaudited Bubble Beam,
  status animations, a faint + switch-in, or non-live moves.
- Gates: supervisor focused 56 + smoke 448; worker full 1,488 files/11,858
  tests, build, typecheck reused. Receipt
  `allocator-history-persistence-supervisor-receipt.json`.
- Follow-ups: widen the list to the extension's 110 ids; status-animation rung
  was skipped (worker misread source availability) though the status audit
  supports occupancy persistence across the nine scripts.

## 2026-10-04 — read-only day audit of today's 31 adapters

- Read-only audit (no edits): no confirmed defect. Certified: duration/side
  symmetry for all 31 ids (only Mud Shot 145/144 and Block 141/146 asymmetric,
  both handled), view-age offsets vs anchors, allocator plan table vs receipts,
  target-idle x2 windows are script timing (species-independent; only the x2
  value is species-specific and uses the rest offset), shared helpers.
- Suspects being decided by alternate-species dense proofs (side lane):
  (1) elevated-opponent enemy shadow on a body's first displayed row is drawn
  only in a few branches and only for opponent attackers; (2) opponent-
  attacker front idle rest offset (ONIX/RATTATA only) missing in ~10 new
  branches; (3) Castform/Unown y-delta special cases in anchors; (4) Detect's
  skipped first opponent row. Block keys on attacker vs source target side:
  equal in singles.

## 2026-10-04 — net-zero audit extended to all 110 live ids

- Side-lane evidence `fa3cefa22` folded (new files only): receipt
  `tools/integration/fixtures/allocator-net-zero-audit-ext.json` (with a
  `combined` section), doc `docs/allocator-net-zero-audit-ext.md`, new staged
  scenarios for Twineedle, Bite, Hyper Fang, Super Fang and Shadow Punch.
- 20 new rows (anchor + anchor2 batches, the five previously unaudited ids,
  Fury Swipes opponent), twice fresh, all net-zero; combined 110/110 live ids
  net-zero, none uncovered. Supervisor rerun of both Bite rows identical.
- The in-flight history-persistence worker pins against the original receipt;
  widening its constant to the combined list is a follow-up.

## 2026-10-04 — anchor2 batch: seven picture-anchor adapters (110 live)

- Folded worker `66952b8fb` (tested code `26b46eff4`, src tree `08b2ac222`):
  Bubble Beam, Hydro Pump, Mud Shot, Cross Chop, Detect, Tail Glow, Torment.
  Adapters 110, remaining 166. No palette plans.
- Reversal dropped: `resolvedShake` comes from
  AnimTask_ShakeTargetBasedOnMovePowerOrDmg. Resume: derive it from the live
  request's power/damage (ordinary requests carry them, e.g. power 60/dmg 47).
- Supervisor dense proof: fourteen fixtures twice fresh, 2,204 rows/run, zero
  residual. Routes PASS for all seven. Target idle-x2 age windows come from
  Onix captures (value uses the species rest offset; unverified elsewhere).
- Gates: supervisor focused 78 + smoke 448; worker full 1,488 files/11,854
  tests, build, typecheck reused. Receipt `anchor2-supervisor-receipt.json`.

## 2026-10-04 — allocator-consumer draw-order tie audit banked

- Side-lane evidence `d5a781ef9` folded (new files only): receipt
  `tools/integration/fixtures/allocator-consumer-tie-audit.json`, doc
  `docs/allocator-consumer-tie-audit.md`, probe and 44 staged scenarios.
- 54 consumer x scenario rows (~5,200 window frames, twice fresh, identical):
  no visible wall/sparkle/shield sprite ever shares a SortSprites key with any
  other visible sprite, so draw order is key-determined; later-body emission
  order showed no inversions although free-slot order differed. Supervisor
  rerun of Light Screen opponent after Toxic + poison status: identical.
- Thin coverage: Protect later bodies only after Protect; Reflect and Magic
  Coat later bodies player side only. Licenses treating free-slot order as
  irrelevant for these six consumers in Factory L50 singles layouts only.

## 2026-10-04 — wall family live with source allocator plans (103 live)

- Folded worker `5b992edaa` (tested code `c09bcf141`, src tree `ea6ba1893`):
  plan table in `prepareLiveMoveSpriteAllocator` (112/113/115/182/243/277)
  and live renderers for Barrier, Magic Coat, Protect, Reflect, Mirror Coat.
  Adapters 103, remaining 173. Live offsets from each view's anchor:
  Barrier/Magic Coat/Protect 0 (anchor at activation), Reflect/Mirror Coat 7.
- Supervisor dense proof: ten wall fixtures + Light Screen regression twice
  fresh, 1,056 rows/run, zero residual (Light Screen digests unchanged).
  Eligibility routes 17/17: adapter as first body, bounded fallback after an
  unproved body; Mirror Coat can only fall back (never a first body).
- Gates: supervisor focused 52 + smoke 448; worker full 1,487 files/11,832
  tests, build, typecheck reused. Receipt `wall-supervisor-receipt.json`.
- Open: sparkle paint follows plan-slot order; free-slot sSpriteOrder is
  history-dependent, so persisting allocator history past earlier bodies first
  needs proof that consumers are independent of free-slot ties (or the
  sprite-order provider).

## 2026-10-04 — status-animation sprite audit banked

- Side-lane evidence `9f6dad6a6` folded (new files only): receipt
  `tools/integration/fixtures/status-animation-sprite-audit.json`, doc
  `docs/status-animation-sprite-audit.md`, probe/batch/receipt tools.
- Poison, Confusion, Burn, Infatuation, Sleep, Paralysis, Freeze, Curse and
  Nightmare (59 windows, both sides, twice fresh): all OBJ-net-zero; each has a
  fixed create/destroy stream (lowest free slot); sprite-order model exact on
  every frame. B_ANIM_STATUS_WRAPPED does not exist; Wrap/Bind/Fire Spin play
  B_ANIM_TURN_TRAP (not a `status-animation` event) and are also net-zero.
  Supervisor fresh rerun of Confusion-by-opponent identical after trimming.
- Effects a production rule must model: free-slot order is permuted by each
  status's stream (apply it, do not treat as no-op); bank-7 unfaded OBJ palette
  is rewritten and left stale for Burn/Confusion/Curse/Nightmare/Infatuation/
  Sleep/trap, so palette consumers of bank 7 still need invalidation.
- Resume: allocator occupancy can stay known across these status windows;
  sprite order needs the per-status stream; palette stays invalidated.

## 2026-10-04 — sprite-order free-slot event model + provider design banked

- Side-lane evidence/design `5f5680b46` folded (new files only):
  `docs/sprite-order-provider-design.md`, model
  `tools/integration/spriteOrderEventModel.py`, receipt
  `tools/integration/fixtures/sprite-order-event-model.json`, raw and probes.
- Source rule (sprite.c SortSprites :372-460 is a full stable insertion sort;
  DestroySprite/ResetSprite give the max key): a destroyed slot goes to the
  head of the free order; same-sort-window destroys keep previous array order;
  CreateSprite just removes its slot. Model exact on 40,185/40,185 twice-fresh
  frames (22 scenarios) and 373,837/373,837 single-run frames (221 scenarios).
  Supervisor reran the model on committed raw and a fresh Blaze Kick probe:
  identical.
- 39/56 move activations need no live keys; 17 (multi-sprite bodies destroyed
  together, e.g. player-first Flamethrower/Blaze Kick, later Dive/Grudge) need a
  live-key tracker. Slice plan (design doc §4): pure SpriteOrderState module ->
  known-entry wiring -> prior single-sprite bodies -> live-key tracker -> one
  adapter per slice (Mud Slap, Sand Attack, Rock Throw, Grudge, Dive, ...).

## 2026-10-04 — sSpriteOrder evidence banked (no provider yet)

- Side-lane evidence `5c7d4612f` folded (new files only): probe, batch runner,
  analyzer, `tools/integration/fixtures/sprite-order-evidence.json`, doc
  `docs/sprite-order-evidence.md`. 251 bodies / 110 moves, both runs identical;
  supervisor rerun of Flamethrower player identical.
- Verdict: occupied-slot order is a fresh sort of known keys, and effect slots
  always sort behind them, but the order AMONG free (effect) slots is leftover
  history (dummy-key ties; e.g. slots 3/4 swap with the number of prior
  actions). Not derivable from known-entry occupants (best model 126/251).
- A persistent 64-entry order array reset at battle entry and advanced by one
  source SortSprites pass per frame reproduces 36,640/36,903 window frames and
  every activation-1 frame; 8 of 10 accepted seeds match activation-1 exactly
  (Mud Slap matches at its first-allocation frame).
- Resume condition for ~19 order-needing moves (Flamethrower, Blaze Kick,
  Dive, Grudge, Aurora Beam, Hyper Beam, Tri Attack, Water Spout, Rock Throw,
  Mud Slap, Sand Attack, Mega Drain, Dream Eater, Giga Drain, Sunny Day,
  Uproar, Magnitude, Pursuit, Rapid Spin): a production per-frame sprite-key
  tracker (all live sprites incl. transient send-out/healthbox/shadow), which
  is a new provider design. Not started.

## 2026-10-04 — anchor batch: battler-anchor helper + seven adapters (98 live)

- Folded worker `99f9935f9` (tested code `9a3e45f0f`, src tree `bcc9f0d2c`):
  `liveBattlerAnchors` (raw source anchors, pinned on 14 fixtures) and Acid,
  Sludge, Sludge Bomb, Water Gun, Harden, Iron Defense, Metal Claw. Adapters
  98, remaining 178. No palette plans.
- MetallicShine bodies (Harden/Iron Defense/Metal Claw) render view age = live
  age - 1: accepted windows start one frame before the task's age 0
  (convention alignment, not a fit; controller timing remains unclaimed).
- Supervisor dense proof: fourteen fixtures twice fresh, 1,692 rows/run, zero
  residual. Routes PASS for all seven. Repeat routes that end in a player
  faint stop at the forced-replacement screen, which
  `generatedCommandAnimationReplay` does not drive (tool limit; also OFF and
  on master) — single-decision routes used.
- Gates: supervisor focused 80 + smoke 448; worker full 1,486 files/11,810
  tests, build, typecheck reused. Receipt `anchor-supervisor-receipt.json`.
- Next: wall-family adapters with source plans; remaining anchor groups
  (picture offsets, coords, heights, effect centers, initial x2).

## 2026-10-04 — sprite-allocator net-zero audit banked

- Side-lane evidence `eee899bee` folded (new files only): probe
  `tools/compare/allocatorNetZeroProbe.py`, batch/manifest/receipt tools,
  receipt `tools/integration/fixtures/allocator-net-zero-audit.json`, doc
  `docs/allocator-net-zero-audit.md`. Production unchanged.
- 91 ids net-zero (86 live adapters plus the five wall moves), 0 not net-zero;
  every body starts and ends at `[0,1,2,6,8,60,61,62,63]`; 203 scenario pairs
  identical across fresh runs; Light Screen/wall calibration reproduced.
  Supervisor reruns of Razor Leaf, Brick Break and Light Screen identical.
- Not audited: Twineedle, Bite, Hyper Fang, Super Fang (fixtures reuse the
  Poison Fang scenario, move never activates) and Shadow Punch (no fixture).
  Fury Swipes player side only. Slot 3 reappears after many bodies as the next
  animation or the damage healthbox hit effect; outside the move script.
- Scope: Scene ON, scenario-specific; status/stat/switch/summary animations not
  covered and still invalidate.

## 2026-10-04 — wall-family source allocator evidence banked

- Side-lane evidence `0014e69f7` folded as `523265bc5` (new files only):
  generic wall-family clock/allocator-call probes, scenarios, five receipts
  `wall-family-<move>-source-receipt.json`, doc
  `docs/wall-family-allocator-evidence.md`. Production unchanged.
- Both orientations twice fresh, raw pairs identical; supervisor fresh reruns of
  Reflect player and Mirror Coat opponent byte-identical. Live offsets: Reflect,
  Mirror Coat, Protect 7; Barrier, Magic Coat 4. Wall slot 3 throughout.
  Reflect sparkles slots 4/5/4 (life 15); Mirror Coat matches Light Screen's
  six-sparkle cycle 4/5/7 (last two live 22). Every move ends net-zero against
  baseline `[0,1,2,6,8,60,61,62,63]`.
- Mirror Coat can never be a first body (priority -5, needs a prior special
  hit): under first-body eligibility it stays bounded fallback. Barrier's
  accepted fixtures are not first-body; new scenarios cover that.
- Next: wall-family adapters with source plans, and an audited net-zero rule so
  audited moves keep allocator history known.

## 2026-10-04 — glow batch: five live adapters (91 live)

- Folded worker `98348602f` (tested code `394aa629a`, src tree `f14e250a1`):
  Synthesis, Milk Drink, Flash, Role Play, Spite. Adapters 91, remaining 185.
  No palette plans; history invalidates after each body.
- Role Play's silhouette now adds the target species' picture y-offset in the
  attacker's orientation (source `CreateAdditionalMonSpriteForMoveAnim`,
  supervisor-checked). Spite uses the source enemy shadow. The framebuffer
  harness passes start frames to the Synthesis/Milk Drink probes.
- Supervisor dense proof: ten fixtures twice fresh, 1,496 rows/run, zero
  residual. Ordinary routes PASS (Synthesis after a damaging turn, Spite after
  a prior move, Flash repeated, Role Play on an independent seed).
- Gates: supervisor focused 57 + smoke 448; worker full 1,485 files/11,787
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/glow-supervisor-receipt.json`.
- Next: battler-anchor helper batch; wall-family source allocator evidence is
  being banked in parallel (side lane, new files only).

## 2026-10-04 — fieldfx batch: six live adapters (86 live)

- Folded `08ccbcaf9` (worker `7dec4734b`, tested code `caaab87a4`, src tree
  `e45fc575d`): Flame Wheel, Fire Spin, Heat Wave, Sandstorm, Sonic Boom,
  Block. Adapters 86, accepted 276, remaining 190. No palette plans added.
- Sonic Boom's live target idle now uses the species rest offset and the
  source enemy shadow; staged output unchanged. Block duration is per side
  (141/146). Fire Spin's live window is the accepted 104 rows.
- Supervisor dense proof: twelve fixtures twice fresh, 1,611 rows/run, zero
  residual. Ordinary routes PASS for all six (Flame Wheel, Sandstorm and Block
  with repeats); Sandstorm's first-found seed 18 is a legitimate no-body route
  (user immobilized by Attract).
- Gates: supervisor focused 40 + smoke 448; worker full 1,484 files/11,776
  tests, build, typecheck reused on the clean merge. Receipt
  `tools/integration/fixtures/fieldfx-supervisor-receipt.json`.
- Next: glow batch (Synthesis, Milk Drink, Flash, Role Play, Spite), then the
  battler-anchor helper with seven projectile/sprite-center moves.

## 2026-10-04 — Light Screen live adapter folded with history guard repaired

- Production `a5d52f2fe` (src tree `b24b89ddbdeffb5e3b3cf19e7091e478537f0ef3`);
  adapters 80, accepted 276, remaining 196. Fast-forward of the repair worker.
- Repair `306b5adf1`: every move animation now passes the allocator seam, so
  only the audited Light Screen plan keeps history known. The withheld
  candidate's three commits were cherry-picked unchanged.
- Supervisor eligibility check (`.codex-logs/verify-ls-eligibility.mjs`) PASS
  7/7: adapter on seeds 2/45/59/114 [3,3] and opponent first body seed 16;
  bounded fallback after unproved 185/318/209 (seeds 27/84, 2 [0,3]). All
  routes: 88 ages, full text, success and repeat failure, action-menu, ON/OFF
  rules/RNG/boundaries equal (scene bit only). Candidate fails the same check.
- Dense source: independent 3 cases twice fresh, 264 rows/run, zero residual,
  digests identical to the worker and the candidate.
- Gates: supervisor affected 6 files/47 tests, smoke 448; worker full
  1,483 files/11,763 tests, build 847, typecheck — reused on clean fast-forward.
  Receipt `tools/integration/fixtures/light-screen-guard-supervisor-receipt.json`.
- Preview <http://127.0.0.1:5191/> serves `28d5be550` (847 modules): four
  canvas/PNG hashes identical to `e3f60734c`, export, ON-to-OFF restart, no
  errors. `playable-preview-28d5be550-receipt.json`.
- Next: bounded H_BASIC adapter batches (Flame Wheel, Fire Spin, Heat Wave,
  Sandstorm, Sonic Boom, Block; then Synthesis, Milk Drink, Flash, Role Play,
  Spite). Light Screen after other bodies stays bounded fallback until more
  allocator plans exist.

## 2026-10-03 — known-entry sprite allocator provider verified

- Production helper `277834353`, tested tree `02b775a5d988d6884c722a48829c8b01931c8e64`;
  adapters79, accepted276, remaining197. No move adapter promoted.
- `createKnownEntrySpriteAllocatorProvider(route)` returns commandPrompt and
  cursor-free firstMove hosts from ported source operations; semantic owners
  distinguish mutable templates. Exact in-frame summary/ball destruction and
  reuse traced, first/end allocator returns verified. No captured slot recipe.
- Supervisor six fresh direct-mGBA runs: both Exeggcute sides twice (82 calls
  each), complete Slowpoke twice (84 each), raw pairs identical. Canonical
  ordinary-input first prompt agrees at1886; detailed call order is the Lab proof.
- Receipt `tools/integration/fixtures/known-entry-sprite-allocator-supervisor-receipt.json`;
  raw `.integration/validation/known-entry-provider-supervisor-9f98134ea/`.
  Worker exploratory/failure and final folders copied to primary; ref/logs kept.
- Gates: independent14files/476smoke+affected; worker FINAL277834353 full
  1,483files/11,761tests (223skipped), build844; scoped source/coverage/audit/diff pass.
  Clean fast-forward reuses same-code full/build under verification contract.
- Preview: <http://127.0.0.1:5191/> serves `e3f60734c`; ordinary input, four
  exact canvas/saved PNG hashes, export, ON-to-OFF restart and no page errors.
  `playable-preview-e3f60734c-receipt.json`; no adapter/source-body credit added.
- Next: immediate provider consumer is Light Screen. Correct activation/wall
  clock and text ownership; dense full script-load/body/cleanup/following display
  bilateral twice and Slowpoke complete; ordinary repeats/prompts and full mode
  parity. Old `d12db7f0b` stays unmerged and uncounted. Later history remains
  unknown; this helper adds no arbitrary-history framebuffer claim.

## 2026-10-03 — exact allocator lifecycle source checkpoint

- Accepted tooling `f9bdab222`; production unchanged at `695e10751`, src tree
  `a5ceb566190019a2cbdd29ea24c9c88318374664`. Adapters79, remaining197.
- Independent six fresh direct-mGBA runs: both Exeggcute orientations twice
  and Slowpoke twice, raw pairs identical. Player activation/cleanup303/388,
  opponent213/298, Slowpoke306/391. Wall3, sparkle4/5/7/4/5/7.
- Source reset, healthbox, shadow, intro/tray/sendout and command-cursor
  destruction observed. VBlank deltas coalesce same-frame free/create calls;
  no runtime recipe, adapter or complete displayed-frame acceptance.
- Receipt: `tools/integration/fixtures/light-screen-allocator-supervisor-receipt.json`;
  raw `.integration/validation/light-screen-allocator-supervisor-f9bdab222/`.
  All worker pass/failure folders copied to primary before cleanup; refs/logs kept.
- Gates: independent source6/6, focused19/19, Python compile; unchanged
  boundary/inventory, coverage/audit/source-audit/diff pass. Prior final pair reused.
- Next: instrument exact in-frame allocator calls and map source callers;
  implement bounded known-entry provider, then fix Light Screen live activation
  clock and completed text, prove full body/cleanup/following display twice
  bilateral plus complete Slowpoke. Candidate `d12db7f0b` stays unmerged.
- Correction: worker attributed Slowpoke +3 to a longer name. Name is shorter;
  causal attribution is not accepted. No deferred material decision.

## 2026-10-03 — Continuation uses the main roadmap

- Setup: integration is S10A in `ROADMAP.md`; normal `./run-supervisor.sh` reads
  the current roadmap instead of a hardcoded mechanics mission. The previous
  supervisor integration flag remains an alias; worker contracts are unchanged.
- Checks: shell syntax, 73 affected tests, boundary/inventory, coverage/audit
  and diff checks pass. Production is unchanged; the final session receipt and
  next Light Screen step below remain the current implementation checkpoint.
- Run mode: default interactive terminal; optional `--headless` streams output
  and keeps logs without the chat interface. Both use Sol 6.1/high and the same
  worker routing/cap. No new supervisor session started for this setup change.





## 2026-10-02 — local integration session wind-down; 79 verified adapters

- State: all14 recovered physical adapters accepted (65→79); eight palette
  plans added (58total,57/79live), actual status-event guard and known-entry
  party/B-cancel return provider accepted. Factory276/277, remaining197,
  whole-playable exact0. Production `695e10751`, src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
- Source: Burn tooling `78c85cb3e` independently verified bilateral twice,
  twelve Small Ember bank7 load/free lifetimes38ticks, real Shadow scratch9.
  Confusion non-Shadow Lick control also passes4fresh runs/eight lifetimes.
  Semantic subject is script attacker/target; transient activeBattler2 is
  bookkeeping. No status provider promoted; all actual status history unknown.
- Gates: final independent1,482files /11,754tests pass (223skipped), build844;
  full ON/OFF rules/RNG at eleven actual draft boundaries equal (scene bit
  only excluded). Last source tools pass verifier, boundary/inventory9,
  coverage/audit/source-audit/diff; no production change since final full pair.
- Evidence: `final-supervisor-gates-20261002.json`, Burn/Confusion-Lick source
  supervisor receipts. All refs/logs and fresh pass/failure raw evidence kept
  in primary; no temporary worker worktrees or active workers. No material
  choice deferred. Preview currently verified `4815edf58`; final refresh follows.
- Next: Light Screen `d12db7f0b` remains unmerged. Derive intro/sendout/summary
  allocator ownership; actual clock303..388(player)/213..298(opponent), preserve
  completed text and extend full framebuffer proof through cleanup/following
  display, both sides twice and complete Slowpoke. See clock/review receipts.
  Then source-owned semantic status provider may use audited Duck/Small Ember
  resources with event subject/priority, lifecycle and real follow-up proof.
  Unknown entry/switch/summary/substitute/transform ownership stays open;
  keep outcomes/RNG/damage/order/progression intact. Factory/Rust not dispatched.

## 2026-10-02 — Light Screen source clock separated from prior controller text

- State: source/tool `c3ccc8cd3` accepted; runtime `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Candidate `d12db7f0b` remains unmerged; no source allocator recipe claimed.
- Proof: independent bilateral twice-fresh source clock, reference/tool/source
  hashes pinned. Player printer269..296, script303, loads304/307, wall310,
  cleanup388; opponent175..206, script213, loads214/217, wall220, cleanup298.
  Old currentMove-selected image windows include prior text and end early.
- Resume: derive intro/sendout/summary creation/destruction and slot ownership;
  use actual controller activation without reprinting completed attack text;
  extend dense framebuffer proof through actual script cleanup/following
  display, including complete alternate Slowpoke, then real command/parity.
  `light-screen-clock-supervisor-receipt.json` and withheld review retain limits.
- Gates: source4runs, Python compile, boundary/inventory9, coverage/audit/diff
  passed. Independent final1,482files /11,754tests and build844 remain valid
  on unchanged production. Full rules/RNG draft parity at all11boundaries
  reconfirmed; generated pixels identical to the verified browser artifacts.
- Preview: <http://127.0.0.1:5191/> serves verified `4815edf58`, eleven exact
  canvas/PNG samples, exports/restarts and no errors. Accepted worktrees
  retired after all fresh pass/failure evidence preservation; refs/logs kept.
- Next: bounded burn-status source witness if deadline permits, then clean
  final handoff. Actual status histories remain unknown. No material decision
  deferred; do not dispatch Factory acceptance or Rust work.

## 2026-10-02 — confusion source checkpoint and independent final production gates

- State: accepted tooling/source `8aefa52bb`; production `695e10751` unchanged.
  Adapters79, plans58 (57/79 live), Factory276/277, remaining197, whole exact0.
  Actual status graphics remain unknown; no palette provider promoted.
- Source: supervisor four fresh legal Golbat/Haunter runs, bilateral twice:
  eight Status_Confusion lifetimes, DUCK bank7 load/free after99ticks, affected
  attacker/target, real following Shadow Punch scratch9/faded dependency.
  Reference ROM/ELF/map and tool/source hashes retained. Source-only claim.
- Gates: independent final full1,482files /11,754tests pass (223skipped),
  build844; unchanged src tree `a5ceb566190019a2cbdd29ea24c9c88318374664`.
  Source checkpoint verifier, boundary/inventory9, coverage/audit/diff pass.
  `final-supervisor-gates-20261002.json`, `status-confusion-supervisor-receipt.json`.
- Preview: <http://127.0.0.1:5191/> refreshed at `4815edf58`; eleven exact
  canvas/PNG samples, ordinary party-cancel and Razor Leaf routes, eleven
  full ON/OFF rules/RNG boundaries, exports/restarts and no browser errors.
  `playable-preview-4815edf58-receipt.json`. Retired worker worktrees removed;
  refs/logs and all fresh pass/failure raw evidence preserved in primary.
- Next: bounded Light Screen source load/text-clock audit, then handoff.
  Light Screen candidate stays unmerged; do not register Reflect by copying
  its allocator. Future confusion provider requires a semantic event lifecycle,
  source allocator and non-Shadow follow-up proof. No material choice deferred.
