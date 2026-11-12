# Per-body / inter-action `sSpriteOrder` plans (S10A slice 3 evidence + design)

Evidence and design only; no production code. Builds on `docs/sprite-order-provider-design.md` (free-slot model `F`,
exact 40185/0), `docs/sprite-order-factory-entry.md` (known entry, both routes) and `src/engine/spriteOrderProvider.ts`.
Question: after the first move allocation, what happens to `F` across move bodies and the gaps between them, and
which of those transforms are history/species independent (so production can apply them like the allocator plans)?

Reproduce everything: `python3 tools/integration/spriteOrderBodyPlans.py --write` (pure python, ~7 s, reads
`tools/integration/fixtures/sprite-order-body-events.json`). Full regeneration from ROM rows is at the end.

## 1. Verdicts (first)

Corpus: 350 single-run scenarios (22 committed raw + 2 Factory entry + 221 extra manifest + 105 stock BattleLab
scenarios for live ids that the allocator net-zero manifests do not cover, incl. the order-dependent predecessors Ember/Perish Song/Heal Bell/Leaf Blade/Dragon Rage/Shadow Punch), all through the existing direct-mGBA event probe
(`spriteOrderEventProbe.py`, never the HTTP oracles). 339 distinct (move id, attacker side) bodies observed;
`python3 tools/integration/spriteOrderEventModel.py` unchanged (array 40185/0).

| result | count |
|---|---|
| (move, side) bodies **EXACT-PLAN** | 246 (240 with a known side; 6 unattributed) |
| (move, side) bodies **NEEDS-KEYS** | 93 |
| LIVE_MOVE_ANIMATION_IDS (144) x orientation cells (288): EXACT-PLAN / NEEDS-KEYS / NOT-OBSERVED | **216 / 59 / 13** |
| live ids EXACT-PLAN in both orientations | 107 |
| live ids NEEDS-KEYS in both orientations | 29: 11 12 56 75 76 78 79 90 95 108 131 135 137 146 172 186 188 213 217 232 236 242 263 280 302 306 336 337 345 |
| live ids mixed / one orientation only | 59 Blizzard (opponent NEEDS-KEYS, player EXACT); 248 Future Sight (opponent EXACT, player not observed) |
| live ids **NOT-OBSERVED** (no scenario of the move as an attacker body) | 41 Twineedle, 44 Bite, 158 Hyper Fang, 162 Super Fang, 207 Swagger, 298 Teeter Dance (the BattleLab files labelled 41/44/158/162 are Poison Fang scenarios; no stock `mechanic-<move>-(player|opponent)` scenario exists for these six) |

Every EXACT-PLAN body has the **same window stream in every observed scenario** of that (move, side) (72 bodies have >= 2
scenarios, all identical). NEEDS-KEYS reasons across live cells: 50 = a multi-destroy group whose members share the
priority word but differ in `oam.y` (order = live y), 3 = the same plus an observed order that contradicts the
key rule (crossed tie), 4 = the window stream differs between scenarios of the same (move, side).

Order-dependent target adapters named in the brief (own body verdict, i.e. whether they can *precede* another order-dependent move;
all of them are reachable as the *target* whenever the preceding units are EXACT):

| move | verdict (both orientations) | note |
|---|---|---|
| Flamethrower 53, Ember 52, Rock Throw 88, Dragon Rage 82, Shadow Punch 325 | EXACT-PLAN | single-slot destroys only |
| Blaze Kick 299 | NEEDS-KEYS | one multi-destroy group, same priority word, different y |
| Mud Slap 189, Sand Attack 28 | NEEDS-KEYS | 6 groups with y-dependent ties |
| Grudge 288, Dive 291 | NEEDS-KEYS | y-dependent (Dive also 2 distinct window streams: first vs later body) |
| Heal Bell 215, Perish Song 195, Leaf Blade 348 | NEEDS-KEYS | y-dependent groups |

Replay of these as *targets* (section 4): all 35 observed activation edges of these moves whose predecessors are EXACT replay exact; Grudge's 2nd and Dive's 3rd action (2 scenarios each)
are preceded by their own NEEDS-KEYS earlier body and are skipped (a production provider would invalidate there).

Full table (live ids; `S`ingle-slot groups are trivial, `static` = distinct priority words, `tie` = tied full keys resolved by
creation order; the counts are per scenario; `n` = scenarios observed):

| id | move | opponent attacker | player attacker |
|---|---|---|---|
| 2 | KARATE_CHOP | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 3 | DOUBLE_SLAP | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=3) |
| 4 | COMET_PUNCH | EXACT (single-slot only; n=5) | EXACT (single-slot only; n=4) |
| 5 | MEGA_PUNCH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 9 | THUNDER_PUNCH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 11 | VICE_GRIP | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 12 | GUILLOTINE | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 14 | SWORDS_DANCE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 21 | SLAM | EXACT (staticx1; n=1) | EXACT (staticx1; n=1) |
| 23 | STOMP | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 25 | MEGA_KICK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 27 | ROLLING_KICK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 29 | HEADBUTT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 34 | BODY_SLAM | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 36 | TAKE_DOWN | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 38 | DOUBLE_EDGE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=2) |
| 39 | TAIL_WHIP | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 41 | TWINEEDLE | NOT-OBSERVED | NOT-OBSERVED |
| 42 | PIN_MISSILE | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 43 | LEER | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=3) |
| 44 | BITE | NOT-OBSERVED | NOT-OBSERVED |
| 47 | SING | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 48 | SUPERSONIC | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 49 | SONIC_BOOM | EXACT (staticx1; n=1) | EXACT (staticx1; n=1) |
| 50 | DISABLE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 51 | ACID | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 55 | WATER_GUN | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 56 | HYDRO_PUMP | KEYS (order contradicts key/creation rule; same priority word, different y; n=1) | KEYS (order contradicts key/creation rule; same priority word, different y; n=1) |
| 57 | SURF | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 59 | BLIZZARD | KEYS (order contradicts key/creation rule; same priority word, different y; n=1) | EXACT (single-slot only; n=1) |
| 60 | PSYBEAM | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 61 | BUBBLE_BEAM | EXACT (staticx13; n=1) | EXACT (staticx13; n=1) |
| 65 | DRILL_PECK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=2) |
| 66 | SUBMISSION | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 67 | LOW_KICK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 68 | COUNTER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 74 | GROWTH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 75 | RAZOR_LEAF | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 76 | SOLAR_BEAM | KEYS (plan varies between scenarios; n=2) | KEYS (plan varies between scenarios; n=2) |
| 78 | STUN_SPORE | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 79 | SLEEP_POWDER | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 83 | FIRE_SPIN | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 86 | THUNDER_WAVE | EXACT (tiex3; n=1) | EXACT (tiex3; n=1) |
| 87 | THUNDER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 89 | EARTHQUAKE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 90 | FISSURE | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 92 | TOXIC | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 93 | CONFUSION | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) (+unattributed EXACT (single-slot only; n=2)) |
| 94 | PSYCHIC | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 95 | HYPNOSIS | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 97 | AGILITY | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 101 | NIGHT_SHADE | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=3) |
| 103 | SCREECH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 105 | RECOVER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 106 | HARDEN | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 107 | MINIMIZE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 108 | SMOKESCREEN | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 109 | CONFUSE_RAY | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 112 | BARRIER | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 113 | LIGHT_SCREEN | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=3) |
| 114 | HAZE | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 115 | REFLECT | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 116 | FOCUS_ENERGY | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 122 | LICK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 124 | SLUDGE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 131 | SPIKE_CANNON | KEYS (same priority word, different y; n=2) | KEYS (same priority word, different y; n=3) |
| 133 | AMNESIA | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 135 | SOFT_BOILED | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 136 | HI_JUMP_KICK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 137 | GLARE | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 146 | DIZZY_PUNCH | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 147 | SPORE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 148 | FLASH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 151 | ACID_ARMOR | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 152 | CRABHAMMER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 153 | EXPLOSION | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 154 | FURY_SWIPES | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=3) |
| 156 | REST | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 158 | HYPER_FANG | NOT-OBSERVED | NOT-OBSERVED |
| 162 | SUPER_FANG | NOT-OBSERVED | NOT-OBSERVED |
| 163 | SLASH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 167 | TRIPLE_KICK | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=3) |
| 172 | FLAME_WHEEL | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 178 | COTTON_SPORE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 180 | SPITE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 182 | PROTECT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 184 | SCARY_FACE | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 186 | SWEET_KISS | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 188 | SLUDGE_BOMB | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 196 | ICY_WIND | EXACT (tiex6; n=1) | EXACT (tiex6; n=1) |
| 197 | DETECT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 201 | SANDSTORM | EXACT (single-slot only; n=3) | EXACT (single-slot only; n=1) |
| 203 | ENDURE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 204 | CHARM | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=2) |
| 207 | SWAGGER | NOT-OBSERVED | NOT-OBSERVED |
| 208 | MILK_DRINK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 211 | STEEL_WING | EXACT (tiex2; n=1) | EXACT (tiex2; n=1) |
| 213 | ATTRACT | — | — (+unattributed KEYS (order contradicts key/creation rule; n=2)) |
| 217 | PRESENT | KEYS (plan varies between scenarios; n=4) | KEYS (plan varies between scenarios; n=2) |
| 223 | DYNAMIC_PUNCH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 227 | ENCORE | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 231 | IRON_TAIL | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 232 | METAL_CLAW | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 235 | SYNTHESIS | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=1) |
| 236 | MOONLIGHT | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 238 | CROSS_CHOP | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 242 | CRUNCH | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 243 | MIRROR_COAT | — | — (+unattributed EXACT (single-slot only; n=2)) |
| 246 | ANCIENT_POWER | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 247 | SHADOW_BALL | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 248 | FUTURE_SIGHT | EXACT (single-slot only; n=1) | — |
| 250 | WHIRLPOOL | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 252 | FAKE_OUT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 257 | HEAT_WAVE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 259 | TORMENT | EXACT (staticx1; n=5) | EXACT (staticx1; n=1) |
| 263 | FACADE | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 264 | FOCUS_PUNCH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=2) |
| 272 | ROLE_PLAY | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 277 | MAGIC_COAT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 280 | BRICK_BREAK | KEYS (same priority word, different y; n=2) | KEYS (same priority word, different y; n=2) |
| 281 | YAWN | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 287 | REFRESH | EXACT (staticx1; n=1) | EXACT (staticx1; n=1) |
| 290 | SECRET_POWER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 294 | TAIL_GLOW | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 298 | TEETER_DANCE | NOT-OBSERVED | NOT-OBSERVED |
| 302 | NEEDLE_ARM | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 305 | POISON_FANG | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) (+unattributed EXACT (single-slot only; n=8)) |
| 306 | CRUSH_CLAW | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 319 | METAL_SOUND | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 320 | GRASS_WHISTLE | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 321 | TICKLE | EXACT (tiex1; n=1) | EXACT (tiex1; n=1) |
| 322 | COSMIC_POWER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 325 | SHADOW_PUNCH | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 330 | MUDDY_WATER | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 334 | IRON_DEFENSE | EXACT (single-slot only; n=2) | EXACT (single-slot only; n=2) |
| 335 | BLOCK | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 336 | HOWL | KEYS (same priority word, different y; n=2) | KEYS (same priority word, different y; n=2) |
| 337 | DRAGON_CLAW | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 339 | BULK_UP | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 341 | MUD_SHOT | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 342 | POISON_TAIL | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 343 | COVET | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |
| 345 | MAGICAL_LEAF | KEYS (same priority word, different y; n=1) | KEYS (same priority word, different y; n=1) |
| 347 | CALM_MIND | EXACT (single-slot only; n=1) | EXACT (single-slot only; n=1) |

## 2. Model: allocation-relative windows

A *unit* is either a **body** (the frames with `act == 1`, activation to script end) or a **gap** (act falls -> next activation;
the very first gap starts after the known entry stream). Every sort window (frame with create/destroy) in a unit is
written with tokens: `("n", k)` = k-th sprite created by the unit (lowest-free creates ascending, then end-of-array creates
descending, per window; `f`/`e` records CreateSprite vs CreateSpriteAtEnd), `("c", ago, r)` = r-th *survivor* of the unit `ago` units
earlier, `("o", slot)` = occupant older than every unit (known-entry occupants; concrete slot). A plan is the ordered list of
windows `{C: [creates], D: [destroys in array order]}`. The transform is `F' = windows applied to F` with exactly the
model of the design doc (create removes the slot from `F`; a destroy group is prepended in group order). Net form of a unit:
`F' = prefix ++ (F without created slots)`, where `prefix` is the destroyed tokens most-recent-window first. No observed mask is used when applying a
plan: slots come from the allocator occupancy (lowest/highest free) and the plan tokens.

Destroy-group classes (members of one sort window), by `SortSprites` key `(priority<<8 | subpriority, y desc)` at destroy time:
| class | rule | needs live keys? |
|---|---|---|
| SINGLE | one slot | no |
| STATIC | all priority words distinct: ascending word (script-assigned subpriority; e.g. Torment's 6-sprite group is words 513..518 = `2<<8|1..6`, monotone in creation order, independent of species/y) | no; order stored in the plan (verified equal to the ascending-word rule in every observed group) |
| FDERIVED | priority word tied (or tied within sub-blocks) **and** y tied: order = (priority word, creation window, free-order index at creation) - exactly the stable-insertion-sort tie rule; computed by the provider from its own `F`, not stored | no (provider keeps `(window seq, F index)` per live created slot) |
| KEYS | same priority word but different y, or observed order contradicts the rule (y crossed) | yes -> INVALIDATE |

Totals over all observed body/gap windows: 3515 single-slot, 55 STATIC, 51 FDERIVED, 331 KEYS. FDERIVED/STATIC never mispredicted
the observed array order (a contradiction would have been reported as KEYS).
Species independence: the class rules are source-rule facts (priority words come from the move script, tie breaking from creation order).
Per (move, side) the corpus has one species pair per orientation, so this is not separately observed per species; the
`staticKeyWordsConstant` flag in the fixture is true for every EXACT body (same priority words in every scenario of a move).

## 3. Gaps and the prompt cycle

Gap shapes (all (prev body, next body) pairs, 581 pairs / 855 occurrences; truncated end-of-trace gaps excluded):
| shape | occurrences | transform |
|---|---|---|
| `[]` | 488 | none |
| transient blip: `C[n0]; D[n0]` | 273 | the lowest free slot leaves `F` and re-enters at its head (**not** a no-op: slot 3 normally) |
| cursor pair cycle: `C[n0,n1]; D[n0,n1]` (FDERIVED, priority word 782 = `3<<8|14`, y = -96, both invisible) | 15 | pair removed from `F`, re-enters at head in F-order-at-creation |
| blip then pair cycle | 13 | composition |
| `D[c1,0]` | 7 | destroys the previous body's first surviving sprite (Dive/Grudge/Fire Spin-class carry-overs) |
| `D[c1,0]; pair cycle` | 1 | composition |

**Prompt cycle (turn boundary):** in all 28 observed second-turn cycles (turn-2 scenarios plus the 2 `spite` pre-gap cycles) the cursor pair is created
as slots [3,4] (the two lowest free) and destroyed 20x as [3,4] and 8x as [4,3]. All 28 are FDERIVED (priority word 782 for both, both invisible at y -96):
the destroy order is the F order of the pair at creation, so the structure is constant (create two lowest-free, destroy both) and the only varying item
(the order) is computed from `F`, never from live keys. No move-menu sprites exist (the FIGHT menu is window/text only; zero extra windows).
Entry cycle: `[4,3]` constant (already in the provider). Not observed: a prompt cycle after a body that leaves survivors
(Dive) or after a status-anim (mv 0) body.

Which gap follows a body is a property of the *previous* body: 214 distinct previous-body keys, only 5 are not pure (mv-0 animations x2 keys, Tackle x2 sides, entry: the blip
appears or not depending on the action), while keyed by the *next* body 41 of 339 are impure. So a gap table keyed by
previous body works for all but the mv-0 (non-move) animations, whose identity the probe does not expose (see open questions). 6 gap pairs are
NEEDS-KEYS: `0:any>0:any`, `0:any>33:*` (2), `33:opponent>33:opponent`, `217:*>33:*` (2, Present then Tackle).

## 4. Replay validation (plans only, from the known entry)

`spriteOrderBodyPlans.py` starts every scenario from `KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER` / `BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS` parsed
from `src/engine/spriteOrderProvider.ts` (entry replay asserted equal to the constant), then applies only the table plan of each unit
(allocator slots resolved from simulated occupancy; FDERIVED order computed; no observed masks) and compares `F` at every body activation edge,
stopping at the first unit that is not EXACT-PLAN.

| quantity | count |
|---|---|
| activation edges in replayed scenarios | 790 |
| edges whose preceding units are all EXACT-PLAN (replayed) | 659 (338 first edges, 321 later edges) |
| **exact** / mismatched | **659 / 0** |
| edges skipped (a preceding unit is NEEDS-KEYS or truncated) | 131 |
| scenarios whose entry *windows* differ from the table (sort-window split differences, slot/F identical at the first edge: Magic Coat, Brick Break x2, Dizzy Punch, Fake Out, Light Screen, +1) | 7 (replayed; F at first edge == constant) |
| scenarios with an intro animation before the first prompt (first body is mv 0 before the first prompt; presumably switch-in ability animations: Hitmontop, Ekans, Masquerain, Howl-alt) | 12 (skipped: F at first edge != constant) |

Caveat (honest): plans are derived from the same corpus they are replayed on, so the replay proves composition (carry-over tokens, allocator
resolution, entry constant, FDERIVED computation, gap sequencing), not generalisation to unseen moves. Independent evidence of generalisation: 72
(move, side) bodies have >= 2 scenarios with different species/histories and an identical plan; Tackle (33) is the filler
body in ~240 scenarios with one plan; the rule classes are source rules. First edges depend only on the entry; later edges (321) cover bodies preceded by
Tackle, status animations, and each other.

**Entry hazard for production:** the entry stream is not universal. 12 of 350 scenarios (all Intimidate-type switch-in animations) reach the
first prompt with a different `F` (slot 3 and the order of the head differ), and 7 more have different sort-window splits. The provider must not
assume the known entry for a roster whose lead has a switch-in ability animation (Intimidate etc.): invalidate (or add an entry plan for that body).
The BattleLab-only evidence is why: the ordinary Factory entry for the two Scene-ON runs matched.

## 5. Production shape (proposal, not implemented)

Table `SPRITE_ORDER_BODY_PLANS`, generated from `sprite-order-body-plans.json` (`bodies` where `verdict == EXACT-PLAN`), keyed by
`"<moveId>:<attackerSide>"` -> `readonly Window[]`, `Window = { create?: ("f"|"e")[]; destroy?: Token[]; tie?: true }`
(`pw` per token only for `tie` groups). A second table `SPRITE_ORDER_GAP_AFTER` keyed by the previous body key
(`gapShapesAfterBody` in the fixture; ambiguous keys -> invalidate).

Application point: where `liveMoveSpriteAllocator.prepareLiveMoveSpriteAllocator` applies allocator plans, apply the plan to the
`SpriteOrderState` in the same call: `create` consumes the slot the allocator returns (`allocateFirst`/`allocateEnd`, mode from the plan) via
`onSpriteOrderCreate`, `destroy` tokens resolve through the per-unit creation list (`n,k`), the survivor lists of earlier
units (`c,ago,r`) or concrete slots (`o`), then `onSpriteOrderDestroyGroup`. For `tie` groups the provider stores `(windowSeq, F index at creation)` per
created slot and orders by `(pw, windowSeq, index)`. No key tracker is needed for any EXACT-PLAN body.
Invalidate (`invalidateSpriteOrderState`, same triggers as `invalidateLiveSpriteAllocatorHost`) when: key absent / verdict NEEDS-KEYS /
NOT-OBSERVED, a body ran truncated, switch/summary/substitute/transform, an intro animation before the first prompt, or an unknown gap.
Between bodies apply the gap shape of the previous body (blip = remove lowest free, re-add at head), and at each turn boundary the
prompt cycle (create two lowest-free, destroy FDERIVED).

Adapters reachable per preceding body: an order-dependent target at action index i is reachable iff the entry is the known entry and every
earlier body (and gap) is EXACT-PLAN. Concretely (from the live list): after any of the 107 both-orientation EXACT ids, Tackle (33), and
status animations whose gap shape is unambiguous. Ember/Flamethrower/Rock Throw/Dragon Rage/Shadow Punch (and Torment 259 as a predecessor, previously thought to need
live keys: its 6-sprite group is STATIC) may also precede order-dependent targets. Blaze Kick, Mud Slap, Sand Attack, Grudge, Dive, Heal Bell,
Perish Song and Leaf Blade bodies make every later order-dependent target unreachable (invalidate) until a `LiveKeyTracker` exists for their y-dependent groups;
as *first* actions or after EXACT predecessors they are fine.

## 6. Open questions

1. Non-move animations (mv 0: stat arrows, status, weather, ability pop-ins) are not identified by the probe; their gap contexts are
   NEEDS-KEYS (and they are not in `LIVE_MOVE_ANIMATION_IDS`). Identifying them (`gBattleAnimScriptPtr`/table id in the probe) would resolve most of the 6 NEEDS-KEYS gaps.
2. Why the transient blip follows some bodies and not others (probably the hit/HP-bar window); the table keys it by previous body, which is exact for
   all observed pairs but only observed per (move, side).
3. Per-species independence of the `tie`/`static` rules is by source argument and corpus consistency, not a per-species sweep; unattributed-side bodies (213 Attract, 243 Mirror Coat, 93 Confusion extras) need
   the scenario shape to carry the attacker side.
4. Intimidate-class entries (12 scenarios) and entry window splits (7) need an entry-plan variant, or invalidation at roster level.
5. Prompt cycle after a survivor-carrying body (Dive) and after the final turn (truncated gaps are excluded from plans) is not observed.
6. Six live ids have no attacker-body scenario.

## 7. Files and regeneration

- `tools/integration/spriteOrderBodyPlans.py` - extractor, classifier, plan derivation, replay (`--write`, `--markdown`, `--extra DIR[,DIR]`).
- `tools/integration/spriteOrderBodyPlansCoverageBatch.py` - direct-mGBA sweep of the live ids outside the allocator audits.
- `tools/integration/fixtures/sprite-order-body-events.json` (compact derived event table, 0.66 MB; the raw rows are ~18 MB + ~15 MB and are not committed).
- `tools/integration/fixtures/sprite-order-body-plans.json` (plans, verdicts, group classes, gap shapes, prompt cycle, replay counts and per-target edges).

```
V=../../vendor; export PYTHONPATH=$V/libmgba-py; PY=$V/mgba-venv/bin/python
$PY tools/integration/spriteOrderEventExtraBatch.py /tmp/ev-extra                       # 221 scenarios (~3.5 min)
$PY tools/integration/spriteOrderBodyPlansCoverageBatch.py /tmp/ev-live 52,215,195,348,82,325   # live ids outside the audits (+ order-dependent predecessors)
python3 tools/integration/spriteOrderBodyPlans.py --extra /tmp/ev-extra,/tmp/ev-live --write      # table + plans + replay
python3 tools/integration/spriteOrderBodyPlans.py --write                                          # plans from the committed table only
```
