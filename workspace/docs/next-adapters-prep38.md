# prep38 — live adapters whose DEFENDER is shown as the Substitute doll (evidence only)

Side lane, new files only. Master 1ee47efd6 (production src e1a47502). Every scenario was probed with direct mGBA only (no shared oracle),
twice from fresh processes, and the two frame series (every RGB sha256) were compared. All **669** receipts are `identical: true` over the
two fresh runs. A second checker pass over the same probes is **byte-identical** (`diff -r`). The temporary src patches are kept as
`tools/integration/fixtures/prep38/*.diff`. They were reverted after every use, and `git status src` was clean at every commit.

**Hypothesis: confirmed for most adapters.** Give the live renderer the doll as the defender's art. That means the
`substitute.json` sheet and palette, the doll corner (40,65) / (144,24), x2 rest 0, no elevation and no shadow. The source's hit and
effect anchors stay on the species (`GetBattlerSpriteCoord` reads the species, not the doll OBJ). With those inputs:
- **27 (move, side) cells are 0 px on every row.** Their combined weight is **22.55** (out of 100 = all Level-50 (move, side) uses).
- 2 more cells (weight 2.21) reproduce exactly the residual of their own doll-free control.

Three named inputs make 5 more moves exact under the patch variants (weight 5.81):
- the sprite order after a Substitute body;
- renderer-local species-art lookups;
- the palette composite.

## 1. Results first

Weight = Factory Level-50 use weight of (move, attacker side) (`spriteOrderPlanCoverageRank.py` model, % of all (move, side) uses; the same
for both sides). Px = run-1 residual over the whole dense window (run 2 identical everywhere). `d` = the live view declines and production
draws the static field.

The columns, read left to right:
- **control**: the same scenario's doll-free body, production as is.
- **fallback**: production today with the doll flagged (`liveMoveSubstituteDollDeclines` declines).
- **v1-prod**: patch v1 with production's order input.
- **v1 / v2 / v3**: the patch variants with the Substitute body treated as order-neutral (`drop-164`, §3).

Windows = [first `gAnimScriptActive` row, first inactive row]. Live age = row + shift, and the shift is calibrated on the doll-free control
bodies (§4).

| move (weight) | side | pair (attacker -> doll) | rows | shift | control | fallback | v1-prod | v1 | v2 | v3 | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EARTHQUAKE (2.261) | p / o | PERSIAN -> SLOWBRO | 208 | 0 | 0 / 0 | 869,466d / 838,386d | 0 / 0 | 0 / 0 | 0 | 0 | **EXACT-WITH-DOLL-ART** |
| AERIAL_ACE (1.108) | p | PERSIAN -> SLOWBRO | 50 | 0 | 0 | 90,631d | 0 | 0 | 0 | 0 | **EXACT** |
| AERIAL_ACE | o | PERSIAN -> SLOWBRO | 50 | 0 | 1 | 85,076d | 1 | 1 | 1 | 1 | DOLL-NEUTRAL: the 1 px (row 10, pixel 138,74) is the control's own pair residual |
| SHADOW_BALL (1.106) | p | SABLEYE -> MAGNETON (accepted pair) | 155 | -5 | n/a | 2,798,124d | 0 | 0 | 0 | 0 | **EXACT** |
| SHADOW_BALL | o | PERSIAN -> SLOWBRO; GOLBAT -> SABLEYE | 156 | -5 | 280,624 | 2,798,172d | 303,440 / 303,816 | same | same | same | DOLL-NEUTRAL on rows 0..136. Rows 137..152 are the 156-row tail phase, which is also in the doll-free 156-row control (the accepted fixture is `notail`). The GOLBAT row 0 is its shadow |
| PSYCHIC (1.078) | p / o | PERSIAN -> SLOWBRO; KADABRA -> GOLBAT | 145 | -5 | 0 / 9 | 2,562,972d / 2,619,401d | 0 / 0 | 0 / 0 | 0 | 0 | **EXACT**. The opponent HAUNTER -> KADABRA row has 200 px on row 0 (the elevated HAUNTER attacker's shadow on a pre-activation row; not the doll) |
| PSYCHIC, elevated doll | p | PERSIAN -> GOLBAT | 145 | -5 | 200 | 2,562,972d | 0 | 0 | 0 | 0 | **EXACT**. The doll hides GOLBAT's row-0 shadow, which the doll-free control shows |
| ROCK_SLIDE (1.058) | o | PERSIAN -> SLOWBRO | 138 | 0 | 0 | 199,813d | 0 | 0 | 0 | 0 | **EXACT** (the adapter is opponent-only) |
| SURF (1.029) | p / o | PERSIAN -> SLOWBRO | 144 | 0 | 0 / 0 | 2,106,144d / 1,589,877d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| ICE_BEAM (0.990) | p / o | PERSIAN -> SLOWBRO; SLOWBRO -> PERSIAN | 203 | 0 | 0 | 3.42M d / 3.52M d | d | 387,281 / 342,677 (df 275,236 / 318,497) | **0 / 0** | 0 | NEEDS-ORDER + NEEDS-ART-LOOKUP (`battleScene.ts:15726`) |
| DOUBLE_EDGE (0.869) | o | PERSIAN -> SLOWBRO; SLOWBRO -> PERSIAN | 141 | 0 | 0 | 694,592d | 0 | 0 | 0 | 0 | **EXACT** |
| DOUBLE_EDGE | p | PERSIAN -> SLOWBRO; SLOWBRO -> PERSIAN | 141 | 0 | 0 | 737,262d | 480 (df 0) | 480 (df 0) | 480 | 480 | the doll is EXACT (df: 0 px). UNRESOLVED-HISTORY: 480 px on 1 row (63; rows 1-2 at full width, outside the doll) only after an earlier Double-Edge |
| DOUBLE_TEAM (0.860) | p | PERSIAN -> SLOWBRO; SLOWBRO -> PERSIAN; ONIX -> GROVYLE | 159 | 0 | 1,854 | 450,691d | d | 40,224 / 2,045 / 300,881 | same | same | UNRESOLVED. Every residual pixel is in the ATTACKER region (x <= 140); the doll region is 0 px. The window (159 rows) is not the live duration (230). Production declines on the `[104, 164]` history (order) |
| THUNDERBOLT (0.809) | p / o | as Ice Beam | 237 | 0 | 0 | 4.18M d / 4.29M d | d | 439,026 / 389,942 | **0 / 0** | 0 | NEEDS-ORDER + NEEDS-ART-LOOKUP (`:27491`) |
| ATTRACT (0.746) | p / o | SLOWBRO -> PERSIAN (female; defender-first) | 435 | 0 | n/a | 5,020,359d / 5,009,330d | 0 / 0 | 0 | 0 | 0 | **EXACT** (no substitute gate before `attackanimation`) |
| BRICK_BREAK (0.730) | p / o | PERSIAN -> SLOWBRO | 151 | 0 | 0 | 1,187,502d / 1,197,970d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| SLUDGE_BOMB (0.728) | p / o | PERSIAN -> SLOWBRO | 169 | -4 | 0 | 130,943d / 129,658d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| GIGA_DRAIN (0.688) | p / o | SLOWBRO -> PERSIAN (defender-first) | 230 | 0 | n/a | 3,709,056d / 3,695,500d | d | **0 / 0** | 0 | 0 | NEEDS-ORDER (0 px with the first-body lend) |
| CRUNCH (0.531) | p / o | PERSIAN -> SLOWBRO | 142 | 0 | 0 | 2,356,607d / 2,421,761d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| BODY_SLAM (0.497) | p / o | PERSIAN -> SLOWBRO | 107 | 0 | 0 | 234,942d / 206,251d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| FAINT_ATTACK (0.476) | p | PERSIAN -> SLOWBRO; MURKROW -> ONIX | 226 | -4 | 0 | 4,204,457d | 0 / 1,148 | 0 / 1,148 | same | same | **EXACT** on PERSIAN -> SLOWBRO. MURKROW -> ONIX: UNRESOLVED, 1,148 px on 1 row (150), all in the attacker region (player-only adapter) |
| FLAMETHROWER (0.476) | p / o | PERSIAN -> SLOWBRO; HOUNDOUR -> MURKROW | 210 | -15 | 0 | 141,291d / 145,768d | 0 (all four) | 0 | 0 | 0 | **EXACT** |
| QUICK_ATTACK (0.474) | o | PERSIAN -> SLOWBRO; PIDGEOTTO -> ONIX | 33 | 0 | 1 / 0 | 39,681d / 35,266d | 1 / 0 | same | same | same | **EXACT** (accepted pair). The PERSIAN pair has 1 px = the control's own |
| QUICK_ATTACK | p | PERSIAN -> SLOWBRO; PIDGEOTTO -> ONIX | 33 | 0 | 18,092 / 0 | 50,068d / 38,604d | 5,111 / 5,601 | same | same | same | **UNRESOLVED**: rows 14..32, 248..344 px/row, inside the doll box (160..195 x 40..71). The accepted-pair control is 0 px. The doll-centre and species-rest negatives are worse or unchanged (§2) |
| BITE (0.455) | p / o | PERSIAN -> SLOWBRO; MEOWTH -> MAGNETON | 41 | -10 | 0 | 21,667d / 17,757d | 0 (all four) | 0 | 0 | 0 | **EXACT** |
| MEGA_KICK (0.438) | p / o | PERSIAN -> SLOWBRO | 160 | 0 | 0 | 2,642,014d / 2,724,547d | 0 / 0 | 0 | 0 | 0 | **EXACT** |
| SWAGGER (0.345) | p / o | SLOWBRO -> PERSIAN | — | — | — | — | — | — | — | — | **BLOCKED-BY-SOURCE**: `jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_MakeMoveMissed` (data/battle_scripts_1.s, EffectSwagger). Measured: no Swagger body in 2 x 2 fresh runs |
| MUD_SLAP D3 (0.270) | p / o | SLOWBRO -> PERSIAN (defender-first; pinned rng2) | 52 | 0 | n/a | 59,163d / 62,056d | d | **0 / 0** | 0 | 0 | NEEDS-ORDER (0 px with the first-body lend; the D3 activation value is pinned from the probe as in s10aLiveFixtures.py) |
| MEGAHORN D4 (0.147) | p / o | PERSIAN -> SLOWBRO; SLOWBRO -> PERSIAN | 177 | 0 | 0 / 280,624 (o: 176-row phase) | 3.08M d / 3.15M d | d | 241k..342k | 95k..105k | **0 (all four)** | NEEDS-ORDER + NEEDS-ART-LOOKUP (`:25388`) + NEEDS-PALETTE-COMPOSITE. All four windows are 177 rows, the policy duration |

Orientations with no live adapter, so not applicable (production is one-sided): ROCK_SLIDE player, FAINT_ATTACK opponent, DOUBLE_TEAM opponent.

BLOCKED-BY-SOURCE (source read; not staged): CONFUSE_RAY (0.828), THUNDER_WAVE (0.693) and TOXIC (0.464). Each runs
`jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_ButItFailed` before `attackanimation`.
- SCARY_FACE (0.429) and the other stat-down moves are blocked the same way, by `BattleScript_EffectStatDown` -> `BattleScript_FailedFromAtkString`.
- Sleep, Poison and Leech Seed have the same gate.
- ROAR has no substitute gate (forced-switch path; not staged).

### One-batch un-decline list (v1 only, production's own order input, 0 px on every row)

27 (move, side) cells, **combined weight 22.553**:
- EARTHQUAKE p+o
- AERIAL_ACE p
- PSYCHIC p+o
- SURF p+o
- ROCK_SLIDE o
- SHADOW_BALL p
- ATTRACT p+o
- BRICK_BREAK p+o
- SLUDGE_BOMB p+o
- CRUNCH p+o
- BODY_SLAM p+o
- FLAMETHROWER p+o
- BITE p+o
- MEGA_KICK p+o
- QUICK_ATTACK o
- DOUBLE_EDGE o

Doll-neutral cells (the residual equals the doll-free control's) add AERIAL_ACE o and SHADOW_BALL o (2.214).

What an integration step needs:
- apply the v1 shape (§3) and lift the DEFENDER half of the decline **for these move ids only**;
- keep the attacker half of the decline;
- keep the decline for every move not in the list. Order-dependent adapters must keep declining while the order is unknown after 164.

### NEEDS-X classes, ranked by weight

1. **NEEDS-ORDER** (5.808, plus DOUBLE_TEAM 0.86). After a Substitute body, production's order tracker returns unknown, so every
   order-dependent adapter declines (`spriteOrderEventTransform.ts:137` puts 164 in `OWNERSHIP_CHANGING_MOVES`; :185 returns null). Affected:
   Ice Beam, Thunderbolt, Giga Drain, Mud-Slap and Megahorn (column `v1-prod` = `d`). With the Substitute body treated as order-neutral
   (`drop-164`: the defender-first `[164]` history lends the first-body order) these windows are 0 px:
   - Giga Drain and Mud-Slap already under v1;
   - Ice Beam and Thunderbolt under v2;
   - Megahorn under v3.

   That is ROM evidence that `Move_SUBSTITUTE` (no `createsprite`) leaves the order as it was. Integration input: a tracker lend after 164
   (a body plan `164:<side>` with an empty sprite set) instead of unknown.
2. **NEEDS-ART-LOOKUP** (3.892). Three renderers look up species art by name instead of calling `liveSceneOnBattlerArt`. Measured:
   - ICE_BEAM at `battleScene.ts:15726` (`battlerArt`);
   - THUNDERBOLT at `:27491` (`artFor`);
   - MEGAHORN at `:25388` (`artFor`).

   Under v1 they draw the species where the doll is: 1.4k..1.9k px/row from row 0, in the defender box. v2 routes every lookup of the doll
   side's species to the doll, and Ice Beam and Thunderbolt become 0 px. `battleScene.ts` has 331 such direct
   `battleBackSpritesAsset` / `opponentFrontSpritesAsset` lookups (staged and live). Each adapter outside the batch must be checked for one.
3. **NEEDS-PALETTE-COMPOSITE** (0.294, Megahorn). `composeLivePalettes` (`liveMovePaletteComposite.ts`; 26 call sites in
   `liveMoveAnimation.ts`) puts the species palette in OBJ bank 16 / 17. Megahorn's monbg draws the doll tiles with it: 95k..105k px under
   v2, 542 / 610 px per row. v3 writes `gSubstituteDollPal` into the doll side's bank, and the result is 0 px.
4. **UNRESOLVED** (doll-related only for QUICK_ATTACK p, 0.474). The others have residuals outside the doll region:
   - DOUBLE_TEAM p (attacker region);
   - DOUBLE_EDGE p (history, rows 1-2 full width);
   - FAINT_ATTACK p MURKROW -> ONIX (1 row, attacker region).

No class "hit blink on the doll", "defender palette blend on the doll bank" or "x2 rest interaction" showed up as a residual. The source
anchors in the v1 shape (species hit anchor, doll rest 0) are what made these rows exact, as the negative controls in §2 show.

## 2. Negative controls (v1, `drop-164`; `neg-center` / `neg-rest` columns of `receipts/summary.txt`)

- `PREP38_DOLL_CENTER=doll` puts the effect / hit anchors at the doll corner instead of the species (`GetBattlerSpriteCoord`). It breaks:
  - ATTRACT (67,014 / 65,594 px);
  - BITE, BODY_SLAM, BRICK_BREAK, CRUNCH, DOUBLE_EDGE, FLAMETHROWER, GIGA_DRAIN, MEGA_KICK, MUD_SLAP, QUICK_ATTACK, SLUDGE_BOMB and SHADOW_BALL p;
  - FAINT_ATTACK (3,996 px; ONIX 7,402 px).

  EARTHQUAKE, SURF, PSYCHIC and ROCK_SLIDE do not read the target anchor, so they stay 0.
- `PREP38_DOLL_REST=species` gives the doll the species idle rest instead of 0. It breaks FAINT_ATTACK MURKROW -> ONIX (32,452 px, rows 0..90;
  ONIX rests at x2 = +1). Every other pair rests at 0, so they do not exercise this input (prep37's caveat).

## 3. The patch shape (file:line at master 1ee47efd6)

`defender-doll-art-env.diff` (v1; the batch needs only this):
- `src/engine/liveMoveAnimation.ts:740` `liveMoveSubstituteDollDeclines`: keep only `side(request.attacker).substituteDoll === true` (the
  DEFENDER half is lifted).
- `liveMoveAnimation.ts:578` `liveBattlerAnchors`: for a doll battler, `picOffsetPoint` comes from the **species** corner (new helper
  `prep38SpeciesOrigin`: field art without the flag -> `battleCommandFieldSpriteOrigin`). `spriteCenter` stays at the doll corner, and
  `frontIdleRest` = {0, 0}.
- `liveMoveAnimation.ts:1183-1200` `liveMoveAnimationPresentation` `battler()`:
  - doll: `animationCenter` from the species corner, `spriteCorner` = the doll corner (field art origin, no elevation), `liveIdleRest` {0, 0}.
- `src/engine/battleScene.ts:4308`: a module hook `prep38LiveDoll {player, opponent}`.
- `battleScene.ts:14880` `liveSceneOnBattlerArt`: when the side is flagged, return `substituteAsset.back` (player) / `.front` (opponent) with
  `substituteAsset.palette`.
- `battleScene.ts:55114-55126` `renderBattleResolutionLiveView`: arm the hook from `view.field.<side>.substituteDoll`, never arm the opponent
  shadow row for a doll opponent, and clear the hook in `finally`.

`defender-doll-art-assets-env.diff` (v2 = v1 + every species-art asset lookup of the doll side). It wraps the `battleScene.ts:515` /
`:683` imports in a Proxy that returns the doll for the flagged side's species. The Proxy is evidence only. The production shape is to route
the three renderer-local lookups (`:15726`, `:25388`, `:27491`) through the doll-aware `liveSceneOnBattlerArt`.

`defender-doll-art-assets-palette-env.diff` (v3 = v2 + palette): the 26 `composeLivePalettes(...)` calls in `liveMoveAnimation.ts` go
through `prep38ComposeLivePalettes(art)`. It writes the doll palette (BGR555) into bank 16 / 17 of the doll side.

The env toggles (`PREP38_DOLL_CENTER`, `PREP38_DOLL_REST`) exist for the negative controls only.

## 4. Method

**Staging** (`prep38Stage.py` -> `fixtures/prep38/scenarios/`, 76 scenarios: 74 measured + 2 Swagger scenarios with no body; mechanicLab,
Scene ON, Factory route). The move-X user is fast and its attack IVs are 0. The defender is slow and has `[SUBSTITUTE x4]`:
- Turn 1: X hits the mon. This is the CONTROL body.
- The defender then subs.
- Turn 2+: X hits the doll. This is the TEST body.

Two other recipes:
- **Defender-first (`df-`)**: the defender subs first, so the X body follows only `[164]`. Used for ATTRACT / SWAGGER, the accepted
  live pairs and the order-dependent moves.
- The elevated GOLBAT doll uses the same recipe with a GOLBAT defender.

The ATTRACT pair is male SLOWBRO -> female PERSIAN (SLOWBRO's Oblivious would block it). SABLEYE is internal id 322 (not the national 302).

**Probe** (`prep38Probe.py`): per frame it records:
- the script label, gCurrentMove, gRng2Value and the RGB sha256;
- per battler: hp / status / status2, behindSubstitute, substituteHP, the sprite and its OBJ tile digest.

RGB (zlib) is saved for animation rows only.

**Fixtures** (`prep38Fixtures.py`): the two runs must agree on every body. CONTROL = the first X body without the doll. TEST = the first X
body with behindSubstitute set on the previous row **and** the defender OBJ showing the doll tiles. Each fixture takes HP / status / gender
at activation and the preceding move bodies. The D3 activation value is gRng2Value at A+1 stepped back once.

**Checker** (`prep38Check.ts`): the production `renderBattleResolutionLiveView(liveView(...))` (liveAdapterFramebuffer.ts), with
`substituteDoll` set on the defender of TEST fixtures and the field art rebuilt from it. It compares every row against both fresh runs.

Ages and window conventions:
- Accepted fixtures put live age 0 a move-specific number of rows after `gAnimScriptActive`. So each CONTROL body is calibrated: the shift
  in [-24, 24] with the smallest residual, ties to the smallest |shift|.
- Calibrated controls are 0 px for Bite (-10), Flamethrower (-15), Psychic (-5), Sludge Bomb (-4) and Faint Attack (-4). Earthquake, Surf
  and the others are 0 px at shift 0.
- Each TEST body uses its move's control shift.
- Production's order input after `[X, 164]` is unknown. The checker then withholds the order (the documented `POKEBENCH_LIVE_ORDER_INPUT=none`
  control), so order-independent adapters still run. `--order=drop-164` drops the Substitute body from the history.

## 5. Fallback cost (production today; `fallback` column)

Production declines and draws the static field with the doll. That costs the whole window, for example:
- EARTHQUAKE 869,466 / 838,386 px (208 rows);
- SURF 2,106,144 / 1,589,877 (144);
- PSYCHIC 2,562,972 (145);
- ATTRACT 5,020,359 (435);
- THUNDERBOLT 4.18M / 4.29M (237).

The batch removes all of it on its 27 cells.

## Not reached

These were not staged:
- COUNTER (it needs a hit taken while the defender only subs);
- FAKE_OUT (first turn only);
- ROAR (forced-switch path, no substitute gate);
- the self-targeted top moves other than Double Team (REST, PROTECT, LIGHT_SCREEN, SUNNY_DAY, ENDURE): the doll is a bystander;
- doubles.

Not measured:
- the order-dependent moves with a real production lend after 164: no lend exists, so `drop-164` stands in for it;
- why QUICK_ATTACK p differs inside the doll box;
- why DOUBLE_TEAM's window is 159 rows while the live duration is 230.

## Reproduce

```sh
OUT=$(mktemp -d) REC=$(mktemp -d) sh tools/integration/prep38Run.sh                 # 76 scenarios x 2 fresh probes (compared) + every check
OUT=<same OUT> REC=$(mktemp -d) SKIP_PROBES=1 sh tools/integration/prep38Run.sh       # second checker pass; diff -r the two REC dirs
python3 tools/integration/prep38Compact.py <REC> tools/integration/fixtures/prep38/receipts   # the committed compact copy
```

`prep38Run.sh` applies each `.diff` in turn and always reverts it (trap). src must be clean. The run takes about 7 minutes (16 cores), or about 3 minutes with `SKIP_PROBES`.
