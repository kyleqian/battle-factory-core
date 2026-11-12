# Soak activation census — 2026-08-25 (supervisor, session 2)

The first census taken with the ACTIVATION dimension of `--coverage-json`
(landed `82aab3f9`, PROGRESS 1398 round 11) across enough seeds to read the
"never activated" complement as a worklist rather than as sampling noise.
Everything below is from the supervisor's own runs on master `a2e72119`
(engine tree unchanged since the 1398 gates).

## Inputs (8 reports, 1,216 seeds, 5,316 battles, 76k executed move actions)

| Report | Command shape | Seeds | Outcome |
| --- | --- | --- | --- |
| cf-fr c0/c14/c28/c49 | `--policy coverage-fight --vary-rng --first-round --start-carry {0,14,28,49} --seeds 0:200 --render-every 0 --parallel 3` | 200 each | see §4 |
| w-fr c0/c28 | `--policy winning --vary-rng --first-round --start-carry {0,28} --seeds 0:200 --render-every 0 --parallel 3` | 200 each | see §4 |
| cf-chain c0 | `--policy coverage-fight --vary-rng --start-carry 0 --seeds 0:8 --render-every 0 --parallel 2` | 8 | 8/8 OK (`budget` 8), 401 battles |
| w-chain c0 | `--policy winning --vary-rng --start-carry 0 --seeds 0:8 --render-every 0 --parallel 2` | 8 | 8/8 OK (`budget` 8), 804 battles |

Union via `node --experimental-strip-types tools/soak/mergeCoverageReports.ts <all 8> --json union.json`.

## §1 Union headline

```
moves      270/276  executed (6 never)     effects    162/166 executed (4 never)
species    263/264  seen (UNOWN never)     abilities   70/71 present · 55/71 ACTIVATED (16 never)
items       40/40   present               ·            35/40 ACTIVATED (5 never)
```

(The move/effect universe closed at 276/276 + 166/166 in the larger 2026-08-25
baseline union, `docs/soak-coverage-baseline-2026-08-25.md`; this smaller
union is only meant to read the activation columns.)

## §2 Abilities never activated (16) — classified

| Ability | L50 carrier sets | Present as lead | Class | Reading |
| --- | --- | --- | --- | --- |
| WATER_VEIL | 8 (Wailmer/Wailord/Seaking) | 62 | **announces, HOLE** | only a PRIMARY burn (Will-O-Wisp, 10 L50 sets) announces it; secondary burns are silently skipped. No receipt. → stage. |
| ARENA_TRAP | 4 (Dugtrio ×4) | 3 | **announces, HOLE** | announces only when the trapped side tries to switch. No receipt. → stage (with the Flying/Levitate exemption as control). |
| DAMP | 13 | 69 | announces, RECEIPTED | `tools/battle-lab/gate6-damp-explosion-{attacker,control,target}-off.json` + `tools/probe/receipts/gate6-damp-explosion-off.json` (Explosion/Damp checkpoint). The manifest's per-ability row still says `engine-referenced-no-oracle-receipt` — a manifest join gap, not an evidence gap. |
| TRACE | 16 | 0 | instrument-blind, EVIDENCED | `tools/battle-lab/mechanic-switchin-trace-off.json` + `docs/switchin-entryhooks-off-evidence.md` (switch-in entry-hook evidence pack). Present 0 is structural: Trace copies the foe's ability into the live slot at switch-in (`battle_util.c` ABILITYEFFECT_TRACE), before the instrument samples `battlers[].ability`, and `STRINGID_PKMNTRACED`'s ability buffer carries the COPIED ability, so Trace itself can never be counted. |
| TRUANT | 4 (Slaking ×4) | 74 | instrument-blind | `STRINGID_PKMNLOAFING` ("{ATK} is loafing around!") carries no ability buffer, so loafing turns are invisible to the activation count. Not a coverage hole: 74 Slaking leads necessarily loafed. |
| CLOUD_NINE | 5 | 14 | announces, RECEIPTED | R3 card. Present 0 in the first 5-report partial union (small-sample), 14 in the full union — do not read a partial union's zeros. |
| MAGMA_ARMOR | 5 | 69 | announces, UNREACHABLE | announces only on a primary freeze attempt or an end-turn cure of an existing freeze; Gen 3 has no primary-freeze move and Magma Armor holders cannot be frozen, so the only routes are Trace/Role Play/Skill Swap onto a frozen mon. Sibling of the receipted IMMUNITY family (Limber R8). |
| NATURAL_CURE | 23 | 188 | silent (Gen 3 switch-out cure prints nothing), RECEIPTED | — |
| EARLY_BIRD, SERENE_GRACE, BATTLE_ARMOR, PURE_POWER, COMPOUND_EYES, MARVEL_SCALE, MINUS, ILLUMINATE | — | — | silent by construction | calculation biases / no battle hook; never countable (module header of `tools/soak/randomRoundSoakCoverage.ts`). |

Thin but non-zero: MAGNET_PULL 1, PRESSURE 1, PLUS 1, FORECAST 1, LIQUID_OOZE 1, PICKUP 1, SAND_VEIL 2, STENCH 2, LIGHTNING_ROD 2, OVERGROW 2.

## §3 Items never activated (5) — classified

| Item | Hold effect | L50 carrier sets | Present | Class |
| --- | --- | --- | --- | --- |
| LEPPA BERRY | RESTORE_PP | 2 (Nidoking 606, Lapras 822) | 2 | **announces, HOLE** — needs a 0-PP slot at end of turn; Nidoking 606 carries two 5-PP moves (Horn Drill, Fire Blast). No receipt. → stage. |
| CHOICE BAND, METAL COAT, MIRACLE SEED, THICK CLUB | — | — | — | silent multipliers. |

Instrument caveat found here: silent items DO show "activations" (Scope Lens 31, BrightPowder 16, SilverPowder 14, Hard Stone 10, Quick Claw 5 …) because the `{B_LAST_ITEM}` buffer of Knock Off / Trick / Covet / Thief messages names the item. Read a silent item's activation count as "was named in an item-manipulation message", not as "its effect fired".

## §4 Outcome counts (all eight sweeps, supervisor's own runs on `a2e72119`)

| Sweep | OK | CRASH | HANG | breakdown |
| --- | --- | --- | --- | --- |
| coverage-fight first-round c0 0:200 | 200 | 0 | 0 | roundLost 194 · roundComplete 6 |
| coverage-fight first-round c14 0:200 | 200 | 0 | 0 | roundLost 198 · `budget` 2 (#125 stalemate class, accepted) |
| coverage-fight first-round c28 0:200 | 200 | 0 | 0 | roundLost 200 |
| coverage-fight first-round c49 0:200 | 200 | 0 | 0 | roundLost 199 · `budget` 1 |
| winning first-round c0 0:200 | 200 | 0 | 0 | roundLost 126 · roundComplete 74 |
| winning first-round c28 0:200 | 200 | 0 | 0 | roundLost 189 · roundComplete 11 |
| coverage-fight full chain c0 0:8 | 8 | 0 | 0 | `budget` 8 (401 battles) |
| winning full chain c0 0:8 | 8 | 0 | 0 | `budget` 8 (804 battles) |

(The first-round counts come from a second, full-log run of the same six
commands — the first pass kept only the coverage tail; per-seed results are
deterministic, so the coverage JSONs and these counts describe the same seeds.)

## §5 Worklist that fell out

1. Stage Water Veil (primary burn vs Wailord), Arena Trap (player switch attempt vs Dugtrio + Flying/Levitate control), Leppa Berry (Nidoking 606 exhausting Horn Drill) — one `overrides.parties` scenario + probe + receipt + Tier-1 engine pin each.
2. Manifest join gap: `tools/report/gate6-coverage-manifest.ts` derives the per-ability "Oracle cards" from the interaction-matrix cards only; family-checkpoint receipts (Damp) and mechanic scenarios (Trace) are not joined, so those rows read `engine-referenced-no-oracle-receipt`. Filler.
3. Instrument filler: attribute `STRINGID_PKMNLOAFING` to Truant and `STRINGID_PKMNTRACED` to Trace so the two instrument-blind abilities become countable.
