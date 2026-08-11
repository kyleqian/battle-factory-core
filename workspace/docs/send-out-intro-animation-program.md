# Send-out intro animations — scope, mechanism, and the proposed rung ladder

Ported-source notes for the per-species animation every battler plays once
when it is sent out. This is a **separate family from move animations** and a
separate family from the ball/emerge sequence, and it is not tracked by
`ANIMATION_COVERAGE.json` (whose acceptance unit is a move). It surfaces today
only ad hoc, one species at a time, which is why it earns its own program.

All figures below are derived from the pinned `reference/pokeemerald/` source;
the derivation script is at the end so any worker can re-run it rather than
trust these numbers.

## 1. Mechanism

The ball part is species-independent (`src/pokeball.c:750-830`,
`SpriteCB_ReleaseMonFromBall`): ball throw → `AnimateBallOpenParticles` →
`LaunchBallFadeMonTask` → `BATTLER_AFFINE_EMERGE` → arc to final position.
That is the part the tint / `gEnemyMonElevation` work already covers.

The sprite callback then forks by side, and **both** branches launch a
per-species animation:

| Side | Callback | Selector | Source |
| --- | --- | --- | --- |
| Opponent (front) | `SpriteCB_OpponentMonFromBall` | `sMonFrontAnimIdsTable[species-1]` | `battle_main.c:2840`, `pokemon.c:1405`, `pokemon.c:6811` |
| Player (back) | `SpriteCB_PlayerMonFromBall` → `BattleAnimateBackSprite` | `3 * GetSpeciesBackAnimSet(species) + sBackAnimNatureModTable[nature]` | `battle_main.c:2987`, `pokemon_animation.c:885,817,968` |

Three consequences worth stating plainly:

1. **The player's animation depends on the mon's nature**, not only species.
   Same species, different nature, different animation.
2. `sMonAnimationDelayTable` delays the anim start for **52 of the 376**
   rental species; `HasTwoFramesAnimation` separately drives the 2-frame OAM
   flip; the cry (`Task_PlayCryWhenReleasedFromBall`, `pokeball.c:665`) gates
   the healthbox slide-in through `waitForCry`.
3. **No `Anim_*` function reads species or mon data.** Grepping
   `pokemon_animation.c` for `GetMonData|species|gBattleMons|GetNature` returns
   only the two *selectors* (`GetSpeciesBackAnimSet:885`, `GetNature:965`).
   Species and nature enter at selection time and nowhere else. This is the
   load-bearing invariant for everything below: **one ported function is
   correct for every species that maps to it.**

## 2. Why this is not optional cosmetics

Every one of these functions freezes its `x2`/`y2` at whatever its own
accumulator held on its **last active tick** and hands the sprite to
`WaitAnimEnd` → `SpriteCallbackDummy` (`pokemon_animation.c:5540-5544`). That
is a **permanent residual offset for the rest of the battle**, until something
unrelated absolutely overwrites it (e.g. `AnimTask_ShakeMon`'s
`sprite->x2 = gBattleAnimArgs[1]`, `battle_anim_mon_movement.c:98-99`).

So skipping a species' intro anim does not merely cost the intro frames — it
leaves that sprite displaced in **every later frame of the battle**, including
windows that never show the send-out at all.

This is not hypothetical. It is already documented in
`src/animation/speciesIdleAnim.ts:9-20`: the settled opponent-front ONIX sits
at `x2=+1` forever, which is the residual DRAGON_RAGE's dense window ran into,
and which `docs/aerial-ace-portable-staging-probe.md` independently hand-fit
for the same sprite before the mechanism was understood. Two separate windows
paid for the same missing residual by hand.

## 3. Scope

Measured over the Battle Factory rental pool: **881 rental entries, 376
distinct species, nature pinned on all 881** (`battle_frontier_mons.h`).

### Front (opponent) — strong collapse, steep head

376 species → **62** distinct functions:

| Functions ported | Rental species covered |
| --- | --- |
| 12 | 212/376 = 56% |
| 20 | 272/376 = 72% |
| 30 | 321/376 = 85% |
| 62 | 376/376 = 100% |

Head of the distribution:

```
ANIM_V_SQUISH_AND_BOUNCE          50 species
ANIM_V_STRETCH                    32
ANIM_V_SHAKE                      24
ANIM_V_SQUISH_AND_BOUNCE_SLOW     16
ANIM_H_SHAKE                      16
ANIM_GROW_VIBRATE                 16
ANIM_SWING_CONCAVE                11
ANIM_V_SLIDE                      10
ANIM_V_JUMPS_SMALL                10
ANIM_H_JUMPS_V_STRETCH            10
ANIM_BOUNCE_ROTATE_TO_SIDES_SLOW   9
ANIM_V_SLIDE_WOBBLE                8
```

### Back (player) — flat, no head to exploit

Nature triples the fan-out: 25 back anim sets × 3 nature mods → **68 distinct
functions actually reachable** across the 881 entries. Top 8 = 34% of entries;
25 functions are needed for 73%. There is no steep head here.

### Cross-family sharing is thin

Static call-graph closure from the table entry points (regex approximation —
treat as a scoping estimate, not exact port units):

| Family | Anim ids | Functions in closure |
| --- | --- | --- |
| Front only | 62 | 105 |
| Back only | 75 | 109 |
| Union | 129 | **194** |
| Entire table | 151 | 232 |

`pokemon_animation.c` has 234 static functions. Full rental-pool coverage is
194 of them — 83% of the file — and only ~20 functions are shared between the
front and back families. **Porting the front family buys almost nothing toward
the back family.** "Port what the Factory needs" and "port the whole file" are
nearly the same job at full fidelity.

The 6× collapse is real, but it happens at the *species → function* mapping,
not inside the function bodies.

## 4. What makes it tractable: two fidelity tiers

Tiering is what makes this affordable, not sharing.

**Tier 1 — terminal residual offset only.** One `(x2, y2)` constant per
function, computed once from the arithmetic at its last active accumulator.
This is the tier that leaks into unrelated windows, and it is what every window
that does *not* capture the send-out actually needs. It is mechanical,
batchable, and self-validating: `src/animation/speciesIdleAnim.ts` already
proves the recipe — `computeTerminalOffset("RAPID_H_HOPS")` returns `x2=1,
y2=0`, matching the RAM probe of `gBattlerSpriteIds[1]` byte-for-byte
(`tools/probe/dump-onix-front-idle-anim.py`).

**Tier 2 — per-tick flight.** Only needed where a committed window actually
captures the send-out. Demand-driven, one species/function at a time, at the
usual dense-oracle bar.

## 5. Already ported (three hand-done one-offs, no dispatcher)

| Where | What | Tier |
| --- | --- | --- |
| `src/animation/speciesIdleAnim.ts:44` | ONIX front, `RAPID_H_HOPS` | terminal only |
| `src/engine/magbySendOut.ts:18` | MAGBY back, `SHAKE_GLOW_RED` (Docile) | per-tick |
| `src/engine/battleMenu.ts:708` | ONIX back, `BACK_ANIM_V_SHAKE` | per-tick |

Note two of the three live in `src/engine/`, outside the animation lane's
owned paths — an artifact of their being found move-first. New work belongs in
`src/animation/`.

## 6. Proposed rung ladder

1. **Selector tables extracted generically.** `sMonFrontAnimIdsTable`,
   `sSpeciesToBackAnimSet`, `sBackAnimNatureModTable`,
   `sMonAnimationDelayTable`, `sBackAnimationIds`. Literal source rows; the
   `identity-const census` idiom applies. **Ownership: this is `src/data/gen/`
   extraction, which is the side lane's, not animation's** — see the handoff
   note in the ledger entry.
2. **Tier-1 constants for the 62 front functions**, with the
   `computeTerminalOffset` recipe generalized out of `speciesIdleAnim.ts`.
   Steep head first; these are the sprites that sit on screen for the whole
   battle. Each is falsifiable against a RAM probe of a settled front sprite.
3. **A dispatcher** in `src/animation/` keyed by species (front) and
   species+nature (back), replacing the three one-offs. Retiring the two
   `src/engine/` instances is a cross-lane change — coordinate, do not
   drive-by.
4. **Tier-1 constants for the 68 reachable back functions**, on demand.
5. **Tier-2 per-tick bodies**, only where a committed window captures the
   send-out.

Rung 2 is the one that closes the residual-offset defect class. Rungs 4-5 are
genuinely demand-driven and should not be batched speculatively.

## 7. Acceptance bar

Unchanged from the rest of the program: a dense oracle window, twice fresh,
both orientations where both are reachable. Two additions specific to this
family:

- A tier-1 constant is accepted against a **RAM probe of the settled sprite**
  (`gBattlerSpriteIds[n]` `x2`/`y2`/`animNum`/`callback`), not against pixels
  alone — the byte-identical fresh-probe verify recipe.
- Because one function covers many species, a promoted function should name
  the species set it covers, and at least one *sibling* species must be
  spot-checked — shared code never promotes siblings without evidence.

## 8. Derivation script

Run from `reference/pokeemerald/`. Reproduces every figure in §3.

```python
import re, collections
a = open('src/pokemon_animation.c').read(); p = open('src/pokemon.c').read()
h = open('src/data/battle_frontier/battle_frontier_mons.h').read()
c = open('include/constants/pokemon.h').read()

ent = re.findall(r'\{\s*\.species\s*=\s*(SPECIES_\w+)(.*?)\n\s*\},', h, re.S)
sp = set(s for s, _ in ent)                                   # 376 species / 881 entries

front = dict(re.findall(r'\[(SPECIES_\w+)\s*-\s*1\]\s*=\s*(ANIM_\w+)',
    re.search(r'sMonFrontAnimIdsTable\[NUM_SPECIES - 1\] =\s*\{(.*?)\n\};', p, re.S).group(1)))
fc = collections.Counter(front[s] for s in sp)                # 62 distinct

sets = dict(re.findall(r'\[(SPECIES_\w+)\]\s*=\s*(BACK_ANIM_\w+)',
    re.search(r'sSpeciesToBackAnimSet\[.*?\] =\s*\{(.*?)\n\};', a, re.S).group(1)))
si = {n: int(v) for n, v in re.findall(r'#define (BACK_ANIM_\w+)\s+(\d+)',
    open('include/pokemon_animation.h').read())}
mod = [int(x) for x in re.findall(r'\b\d+\b',
    re.search(r'sBackAnimNatureModTable\[NUM_NATURES\] =\s*\{(.*?)\n\};', a, re.S).group(1))]
ni = {n: i for i, (n, _) in enumerate(re.findall(r'#define (NATURE_\w+)\s+(\d+)', c))}
ids = re.findall(r'\bANIM_[A-Z0-9_]+\b',
    re.search(r'sBackAnimationIds\[\] =\s*\{(.*?)\n\};', a, re.S).group(1))
bc = collections.Counter()
for s, b in ent:                                              # 68 distinct reachable
    n = re.search(r'\.nature\s*=\s*(NATURE_\w+)', b).group(1)
    bc[ids[3 * (si[sets[s]] - 1) + mod[ni[n]]]] += 1

fns = dict(re.findall(r'\nstatic [\w \*]+?(\w+)\([^;{]*?\)\n\{\n(.*?)\n\}\n', a, re.S))
m = dict(re.findall(r'\[(ANIM_\w+)\]\s*=\s*(\w+)',
    re.search(r'sMonAnimFunctions\[\]\)\(struct Sprite \*sprite\) =\s*\{(.*?)\n\};', a, re.S).group(1)))
def closure(roots):
    seen, st = set(), list(roots)
    while st:
        f = st.pop()
        if f in seen or f not in fns: continue
        seen.add(f)
        st += [x for x in set(re.findall(r'\b\w+\b', fns[f])) if x in fns and x not in seen]
    return seen
# closure([m[x] for x in set(fc) | set(ids)]) -> 194 of 234 static functions
```
